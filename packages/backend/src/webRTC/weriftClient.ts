import WebSocket from "ws";
import * as dgram from "dgram";
import { spawn, ChildProcess } from "child_process";
import {
  RTCPeerConnection,
  RTCRtpCodecParameters,
  MediaStream,
  MediaStreamTrack,
  RtpPacket,
  Event,
} from "werift";
import {
  MediaRecorder as WeriftMediaRecorder,
  type WebmOutput,
} from "werift/nonstandard";
import { ioState } from "../state/states/ioState";
import dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

const ROOM_ID = "chat sync";
const CHAT_SYNC_URL = process.env.CHAT_SYNC_URL ?? "ws://localhost:3000/ws";
// dev で sync が自己署名 HTTPS の場合、TLS 検証を無効化する。
// NODE_ENV=production または CHAT_SYNC_TLS_STRICT=1 で厳格検証に戻す。
const TLS_REJECT_UNAUTHORIZED =
  process.env.NODE_ENV === "production" ||
  process.env.CHAT_SYNC_TLS_STRICT === "1";
const RTP_VIDEO_PORT = 5004;
const RTP_AUDIO_PORT = 5006;
// Payload types must match what ffmpeg outputs for VP8/Opus RTP
const PT_VIDEO = 96;
const PT_AUDIO = 111;

// coturn は sync シグナリングサーバと同一ホストで動作する前提。
// TURN_HOST 未指定時は CHAT_SYNC_URL からホスト名を抽出する。
const TURN_HOST = process.env.TURN_HOST ?? extractHost(CHAT_SYNC_URL);
const TURN_PORT = process.env.TURN_PORT ?? "3478";
const TURN_USERNAME = process.env.TURN_USERNAME ?? "webrtc";
const TURN_CREDENTIAL = process.env.TURN_CREDENTIAL ?? "webrtcpass";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: `stun:${TURN_HOST}:${TURN_PORT}` },
  {
    urls: `turn:${TURN_HOST}:${TURN_PORT}`,
    username: TURN_USERNAME,
    credential: TURN_CREDENTIAL,
  },
  {
    urls: `turn:${TURN_HOST}:${TURN_PORT}?transport=tcp`,
    username: TURN_USERNAME,
    credential: TURN_CREDENTIAL,
  },
];

function extractHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "localhost";
  }
}

type IceCandidateData = {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
};

let ws: WebSocket | null = null;
let pc: RTCPeerConnection | null = null;
let myPeerId = "";
let remotePeerId = "";
let pendingCandidates: IceCandidateData[] = [];

let ffmpegProc: ChildProcess | null = null;
let videoUdp: dgram.Socket | null = null;
let audioUdp: dgram.Socket | null = null;
let videoTrack: MediaStreamTrack | null = null;
let audioTrack: MediaStreamTrack | null = null;

// 受信パイプライン (werift 内蔵 MediaRecorder で RTP→WebM 直接変換)
// video/audio を別 recorder に分けるのは block timecode 単調性を保つため。
// 同一 recorder で multiplex すると MSE が "block with a timecode before
// the previous block" で reject する。
let recvRecorder: WeriftMediaRecorder | null = null;
let recvAudioRecorder: WeriftMediaRecorder | null = null;
const pliTimers: NodeJS.Timeout[] = [];

// 再接続制御
let stopRequested = false;
let reconnectAttempt = 0;
let reconnectTimer: NodeJS.Timeout | null = null;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;

export function startWebRTCSession(): void {
  if (ffmpegProc) {
    console.log("[werift] session already active");
    return;
  }
  console.log(`CHat Sync URL: ${CHAT_SYNC_URL}`);
  console.log(`[werift] TURN: turn:${TURN_HOST}:${TURN_PORT} (user=${TURN_USERNAME})`);
  console.log(`[werift] TLS rejectUnauthorized=${TLS_REJECT_UNAUTHORIZED}`);
  stopRequested = false;
  reconnectAttempt = 0;
  // chat_sync のログ上でブラウザクライアントと区別できるよう 'itsuki-' を必ず前置する
  myPeerId = `itsuki-${Math.random().toString(36).slice(2, 8)}`;
  startFfmpegPipeline();
  // recv パイプラインは peer-joined / peer-ready でピア接続のたびに起動する。
  // (CALL 時に起動して長時間 idle にすると ffmpeg の内部状態が不安定になり、
  //  最初の RTP を消化できず frame=0 のまま固まる)
  connectToChatSync();
}

export function stopWebRTCSession(): void {
  stopRequested = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  ffmpegProc?.stdin?.end();
  ffmpegProc?.kill("SIGTERM");
  ffmpegProc = null;
  videoUdp?.close(); videoUdp = null;
  audioUdp?.close(); audioUdp = null;
  killRecvPipeline();
  pc?.close(); pc = null;
  ws?.close(); ws = null;
  videoTrack = null;
  audioTrack = null;
  remotePeerId = "";
  pendingCandidates = [];
  console.log("[werift] session stopped");
}

// 現在 MediaRecorder を回している送信元クライアント ID。
// rotator がローテーションのたびに更新する。null の間はチャンクを破棄して
// ffmpeg 再起動中の旧 sender の flush 残りで新 pipeline を汚さないようにする。
let activeSourceClientId: string | null = null;

export function setActiveSourceClientId(id: string | null): void {
  activeSourceClientId = id;
}

export function feedWebMChunk(chunk: Buffer, fromId?: string): void {
  if (activeSourceClientId === null) return;
  if (fromId !== undefined && fromId !== activeSourceClientId) return;
  if (ffmpegProc?.stdin?.writable) {
    ffmpegProc.stdin.write(chunk);
  }
}

// ---- ffmpeg pipeline ----

function ensureTracks(): void {
  if (!videoTrack) videoTrack = new MediaStreamTrack({ kind: "video" });
  if (!audioTrack) audioTrack = new MediaStreamTrack({ kind: "audio" });
}

function startFfmpegPipeline(): void {
  ensureTracks();
  startFfmpegSubprocess();
}

export async function restartFfmpegSubprocess(): Promise<void> {
  await stopFfmpegSubprocess();
  startFfmpegSubprocess();
}

function stopFfmpegSubprocess(): Promise<void> {
  return new Promise((resolve) => {
    const proc = ffmpegProc;
    if (!proc) {
      resolve();
      return;
    }
    // close ハンドラが ffmpegProc / videoUdp / audioUdp を null クリアする
    proc.once("close", () => resolve());
    try { proc.stdin?.end(); } catch { /* ignore */ }
    proc.kill("SIGTERM");
  });
}

function startFfmpegSubprocess(): void {
  if (ffmpegProc) return;

  let videoRtpRx = 0;
  let videoRtpErr = 0;
  videoUdp = dgram.createSocket("udp4");
  videoUdp.on("message", (msg) => {
    try {
      const rtp = RtpPacket.deSerialize(msg);
      videoTrack?.writeRtp(rtp);
      videoRtpRx++;
      if (videoRtpRx === 1 || videoRtpRx % 200 === 0) {
        console.log(
          `[ffmpeg→werift] video RTP rx=${videoRtpRx} err=${videoRtpErr} pt=${rtp.header.payloadType} seq=${rtp.header.sequenceNumber}`,
        );
      }
    } catch (e) {
      videoRtpErr++;
      if (videoRtpErr <= 3) {
        console.warn("[ffmpeg→werift] video RTP parse error:", e);
      }
    }
  });
  videoUdp.bind(RTP_VIDEO_PORT, "127.0.0.1");

  let audioRtpRx = 0;
  let audioRtpErr = 0;
  audioUdp = dgram.createSocket("udp4");
  audioUdp.on("message", (msg) => {
    try {
      const rtp = RtpPacket.deSerialize(msg);
      audioTrack?.writeRtp(rtp);
      audioRtpRx++;
      // Opus 20ms = 50 pkt/秒。初回〜10 packet と以降 50 ごとに出力
      if (audioRtpRx <= 10 || audioRtpRx % 50 === 0) {
        console.log(
          `[ffmpeg→werift] audio RTP rx=${audioRtpRx} err=${audioRtpErr} pt=${rtp.header.payloadType} seq=${rtp.header.sequenceNumber} ts=${rtp.header.timestamp}`,
        );
      }
    } catch (e) {
      audioRtpErr++;
      if (audioRtpErr <= 3) {
        console.warn("[ffmpeg→werift] audio RTP parse error:", e);
      }
    }
  });
  audioUdp.bind(RTP_AUDIO_PORT, "127.0.0.1");

  // WebM (VP8+Opus) from stdin → VP8 RTP on :5004, Opus RTP on :5006
  // 注意: output が複数あるとき ffmpeg は audio を低優先で間引く挙動があるため、
  //       -flush_packets 1 / -max_delay 0 で即座に送出させる。
  //       -copyts で input の dts をそのまま使い、再ジッタを避ける。
  ffmpegProc = spawn("ffmpeg", [
    "-fflags", "+nobuffer",
    "-analyzeduration", "0",
    "-probesize", "32",
    "-i", "pipe:0",
    // video: VP8 copy → RTP
    "-map", "0:v:0",
    "-c:v", "copy",
    "-payload_type", String(PT_VIDEO),
    "-flush_packets", "1",
    "-max_delay", "0",
    "-f", "rtp",
    `rtp://127.0.0.1:${RTP_VIDEO_PORT}`,
    // audio: Opus copy → RTP
    "-map", "0:a:0",
    "-c:a", "copy",
    "-payload_type", String(PT_AUDIO),
    "-flush_packets", "1",
    "-max_delay", "0",
    "-f", "rtp",
    `rtp://127.0.0.1:${RTP_AUDIO_PORT}`,
  ]);

  ffmpegProc.stderr?.on("data", (d: Buffer) => {
    console.log("[ffmpeg]", d.toString().trim());
  });

  ffmpegProc.on("close", (code) => {
    console.log("[ffmpeg] exited:", code);
    ffmpegProc = null;
    videoUdp?.close(); videoUdp = null;
    audioUdp?.close(); audioUdp = null;
  });

  console.log("[werift] ffmpeg pipeline started");
}

// ---- 受信パイプライン (werift 内蔵 MediaRecorder で RTP→WebM) ----
// ffmpeg を経由せず werift が直接 RTP を depacketize → WebM Cluster を構築。
// keyframe 検出も werift 内部で処理されるため、ffmpeg の keyframe 待ちで
// Cluster が flush されない問題を回避できる。

function startRecvPipeline(): void {
  if (recvRecorder) return;   // 既に起動済み (idempotent)

  const stream = new Event<[WebmOutput]>();
  const chunkCountByKind: Record<string, number> = {};
  stream.subscribe((output: WebmOutput) => {
    if (!output.saveToFile) return;
    const buf = output.saveToFile;
    const kind = output.kind ?? "unknown";
    chunkCountByKind[kind] = (chunkCountByKind[kind] ?? 0) + 1;
    // 各 kind の最初の 3 件と、cluster/block は 30 件ごとにログ
    const n = chunkCountByKind[kind];
    if (n <= 3 || (n % 30 === 0)) {
      const head = buf.subarray(0, Math.min(4, buf.length)).toString("hex");
      console.log(`[werift recorder] kind=${kind} #${n} ${buf.length}B head=${head}`);
    }
    const ab = buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.byteLength,
    );
    ioState?.io.emit("mediaChunkFromServer", ab);
  });

  recvRecorder = new WeriftMediaRecorder({
    numOfTracks: 1,    // video のみ録画 (audio を混ぜると timecode が単調にならず MSE が拒否)
    stream,
    // LipSync は audio/video 同期 (1 トラックなら不要)
    disableLipSync: true,
    // NTP 時刻同期も無効化 (RTCP SR 必須を避ける) → 純粋な RTP timestamp を使用
    disableNtp: true,
  });

  recvRecorder.onError.subscribe((e) => {
    console.error(
      "[werift recorder] error:",
      e instanceof Error ? e.message : String(e),
    );
  });

  // ── audio 用 recorder (Opus → WebM) ──
  const audioStream = new Event<[WebmOutput]>();
  const audioChunkCountByKind: Record<string, number> = {};
  audioStream.subscribe((output: WebmOutput) => {
    if (!output.saveToFile) return;
    const buf = output.saveToFile;
    const kind = output.kind ?? "unknown";
    audioChunkCountByKind[kind] = (audioChunkCountByKind[kind] ?? 0) + 1;
    const n = audioChunkCountByKind[kind];
    if (n <= 3 || n % 50 === 0) {
      const head = buf.subarray(0, Math.min(4, buf.length)).toString("hex");
      console.log(
        `[werift audio recorder] kind=${kind} #${n} ${buf.length}B head=${head}`,
      );
    }
    const ab = buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.byteLength,
    );
    ioState?.io.emit("audioChunkFromServer", ab);
  });

  recvAudioRecorder = new WeriftMediaRecorder({
    numOfTracks: 1,
    stream: audioStream,
    disableLipSync: true,
    disableNtp: true,
  });

  recvAudioRecorder.onError.subscribe((e) => {
    console.error(
      "[werift audio recorder] error:",
      e instanceof Error ? e.message : String(e),
    );
  });

  console.log("[werift] recv recorder created (waiting for tracks)");
}

function killRecvPipeline(): void {
  if (!recvRecorder && !recvAudioRecorder) return;
  for (const t of pliTimers) clearInterval(t);
  pliTimers.length = 0;
  if (recvRecorder) {
    const r = recvRecorder;
    recvRecorder = null;
    r.stop().catch((e) =>
      console.warn("[werift recorder] stop error:", e instanceof Error ? e.message : e),
    );
  }
  if (recvAudioRecorder) {
    const ar = recvAudioRecorder;
    recvAudioRecorder = null;
    ar.stop().catch((e) =>
      console.warn(
        "[werift audio recorder] stop error:",
        e instanceof Error ? e.message : e,
      ),
    );
  }
  console.log("[werift] recv recorders stopped");
  ioState?.io.emit("mediaResetFromServer");
}

// ---- signaling ----

// SDP の audio m-line と関連する direction / rtpmap / fmtp / ssrc を抜粋して log
function logSdpAudioLines(label: string, sdp: string | undefined): void {
  if (!sdp) {
    console.log(`${label} (no sdp)`);
    return;
  }
  const lines = sdp.split(/\r?\n/);
  let inAudio = false;
  const out: string[] = [];
  for (const line of lines) {
    if (line.startsWith("m=")) {
      inAudio = line.startsWith("m=audio");
      if (inAudio) out.push(line);
    } else if (inAudio && (
      line.startsWith("a=sendrecv") ||
      line.startsWith("a=sendonly") ||
      line.startsWith("a=recvonly") ||
      line.startsWith("a=inactive") ||
      line.startsWith("a=rtpmap") ||
      line.startsWith("a=fmtp") ||
      line.startsWith("a=ssrc") ||
      line.startsWith("a=mid")
    )) {
      out.push(line);
    }
  }
  console.log(`${label} audio:\n  ${out.join("\n  ")}`);
}

function connectToChatSync(): void {
  ws = new WebSocket(CHAT_SYNC_URL, {
    rejectUnauthorized: TLS_REJECT_UNAUTHORIZED,
  });

  ws.on("open", () => {
    console.log("[werift] connected to chat_sync:", CHAT_SYNC_URL);
    reconnectAttempt = 0;
    send({ type: "join", roomId: ROOM_ID, peerId: myPeerId });
  });

  ws.on("message", async (raw) => {
    const msg = JSON.parse(raw.toString()) as Record<string, unknown>;
    console.log("[werift] <-", msg.type);

    switch (msg.type) {
      case "joined":
        console.log(`[werift] joined room "${msg.roomId}" as ${msg.peerId}`);
        break;

      case "peer-joined": {
        // Existing peer → we are the OFFERER
        remotePeerId = msg.peerId as string;
        pc = buildPeerConnection();
        startRecvPipeline();
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        logSdpAudioLines("[LOCAL offer]", pc.localDescription?.sdp);
        send({ type: "offer", sdp: pc.localDescription, to: remotePeerId, from: myPeerId });
        break;
      }

      case "peer-ready":
        // New peer joined → we are the ANSWERER, wait for offer
        remotePeerId = msg.peerId as string;
        pc = buildPeerConnection();
        startRecvPipeline();
        break;

      case "offer": {
        if (!pc) pc = buildPeerConnection();
        await pc.setRemoteDescription(msg.sdp as RTCSessionDescriptionInit);
        logSdpAudioLines("[REMOTE offer]", (msg.sdp as { sdp?: string }).sdp);
        await flushCandidates();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        logSdpAudioLines("[LOCAL answer]", pc.localDescription?.sdp);
        send({ type: "answer", sdp: pc.localDescription, to: msg.from, from: myPeerId });
        break;
      }

      case "answer":
        await pc!.setRemoteDescription(msg.sdp as RTCSessionDescriptionInit);
        logSdpAudioLines("[REMOTE answer]", (msg.sdp as { sdp?: string }).sdp);
        await flushCandidates();
        break;

      case "ice-candidate":
        if (pc?.remoteDescription) {
          await pc.addIceCandidate(msg.candidate as IceCandidateData);
        } else {
          pendingCandidates.push(msg.candidate as IceCandidateData);
        }
        break;

      case "peer-left":
        console.log("[werift] peer left:", msg.peerId);
        await pc?.close();
        pc = null;
        remotePeerId = "";
        pendingCandidates = [];
        killRecvPipeline();
        // 同一WSセッション内で別ピアが入ってきたら sync 側が
        // peer-joined / peer-ready を送り直し、そのハンドラで
        // startRecvPipeline が再実行されてクリーンに再起動する
        break;

      case "room-full":
        console.log("[werift] room is full");
        break;
    }
  });

  ws.on("close", () => {
    console.log("[werift] disconnected from chat_sync");
    scheduleReconnect();
  });
  ws.on("error", (err: Error) => {
    console.error("[werift] WebSocket error:", err.message);
    // close も発火するので scheduleReconnect は close 側に任せる
  });
}

function scheduleReconnect(): void {
  if (stopRequested) return;
  if (reconnectTimer) return;

  // 既存PC・候補バッファをクリア（新セッションでは別ピアになる可能性）
  pc?.close();
  pc = null;
  remotePeerId = "";
  pendingCandidates = [];

  const delay = Math.min(
    RECONNECT_BASE_MS * 2 ** reconnectAttempt,
    RECONNECT_MAX_MS,
  );
  reconnectAttempt++;
  console.log(`[werift] reconnecting in ${delay}ms (attempt ${reconnectAttempt})`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (stopRequested) return;
    connectToChatSync();
  }, delay);
}

// ---- RTCPeerConnection ----

function buildPeerConnection(): RTCPeerConnection {
  if (!videoTrack || !audioTrack) {
    throw new Error("[werift] tracks not initialized — call startWebRTCSession first");
  }

  const p = new RTCPeerConnection({
    iceServers: ICE_SERVERS,
    codecs: {
      video: [
        new RTCRtpCodecParameters({
          mimeType: "video/VP8",
          clockRate: 90000,
          payloadType: PT_VIDEO,
        }),
      ],
      audio: [
        new RTCRtpCodecParameters({
          mimeType: "audio/opus",
          clockRate: 48000,
          channels: 2,
          payloadType: PT_AUDIO,
        }),
      ],
    },
  });

  const stream = new MediaStream([videoTrack, audioTrack]);
  const videoTransceiver = p.addTransceiver(videoTrack, {
    direction: "sendrecv",
    streams: [stream],
  });
  const audioTransceiver = p.addTransceiver(audioTrack, {
    direction: "sendrecv",
    streams: [stream],
  });

  // 接続後、定期的に sender stats を出して outbound RTP の流量を確認する
  let statsTimer: NodeJS.Timeout | null = null;
  const dumpSenderStats = async (): Promise<void> => {
    try {
      const collect = async (
        label: string,
        sender: typeof videoTransceiver.sender,
      ): Promise<void> => {
        const stats = (await sender.getStats()) as unknown as Array<
          Record<string, unknown>
        >;
        let line = `[werift sender stats:${label}]`;
        for (const s of stats) {
          if (s.type === "outbound-rtp") {
            line += ` packets=${s.packetsSent ?? "?"} bytes=${s.bytesSent ?? "?"} ssrc=${s.ssrc ?? "?"}`;
          }
        }
        console.log(line);
      };
      await collect("video", videoTransceiver.sender);
      await collect("audio", audioTransceiver.sender);
    } catch (e) {
      console.warn(
        "[werift sender stats] error:",
        e instanceof Error ? e.message : e,
      );
    }
  };
  p.connectionStateChange.subscribe((state) => {
    if (state === "connected" && !statsTimer) {
      statsTimer = setInterval(() => {
        void dumpSenderStats();
      }, 2000);
    } else if (state === "closed" || state === "failed") {
      if (statsTimer) {
        clearInterval(statsTimer);
        statsTimer = null;
      }
    }
  });

  p.ontrack = ({ track, transceiver }) => {
    console.log("[werift] track received:", track.kind);

    // video / audio を別々の recorder に投げる (timecode 単調性のため)
    if (track.kind === "video") {
      recvRecorder?.addTrack(track).catch((e) =>
        console.error(
          "[werift recorder] addTrack failed:",
          e instanceof Error ? e.message : e,
        ),
      );
    } else if (track.kind === "audio") {
      recvAudioRecorder?.addTrack(track).catch((e) =>
        console.error(
          "[werift audio recorder] addTrack failed:",
          e instanceof Error ? e.message : e,
        ),
      );
    }

    if (track.kind === "video") {
      // keyframe 取得戦略:
      //  1) 接続直後に PLI を集中送信 (500ms × 5 回 = 2.5秒間)
      //  2) 以降は 2 秒ごとの定期 PLI に切り替え (パケットロス耐性)
      const ssrc = track.ssrc!;
      const sendPli = (label: string): void => {
        try {
          transceiver.receiver.sendRtcpPLI(ssrc);
          console.log(`[werift] PLI sent (${label}) ssrc=${ssrc}`);
        } catch (e) {
          console.warn(`[werift] PLI failed (${label}):`,
            e instanceof Error ? e.message : e);
        }
      };
      track.onReceiveRtp.once(() => sendPli("first-rtp"));
      let burstCount = 0;
      const burstTimer = setInterval(() => {
        burstCount++;
        sendPli(`burst-${burstCount}`);
        if (burstCount >= 5) {
          clearInterval(burstTimer);
          const periodicTimer = setInterval(
            () => sendPli("periodic"),
            2000,
          );
          pliTimers.push(periodicTimer);
        }
      }, 500);
      pliTimers.push(burstTimer);
    }
  };

  p.onIceCandidate.subscribe((candidate) => {
    if (candidate && remotePeerId) {
      send({
        type: "ice-candidate",
        candidate: {
          candidate: candidate.candidate,
          sdpMid: candidate.sdpMid,
          sdpMLineIndex: candidate.sdpMLineIndex,
        },
        to: remotePeerId,
        from: myPeerId,
      });
    }
  });

  p.connectionStateChange.subscribe((state) => {
    console.log("[werift] connection state:", state);
  });

  return p;
}

// ---- helpers ----

async function flushCandidates(): Promise<void> {
  for (const c of pendingCandidates.splice(0)) {
    await pc!.addIceCandidate(c);
  }
}

function send(msg: object): void {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}
