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
// 現アクティブ送信元から ffmpeg に流し込めたチャンク数。
// setActiveSourceClientId のたびに 0 にリセットする。rotator がこれを見て
// 「対象クライアントが実際に録画を開始したか」を判定し、未開始なら
// bufferRecReqFromServer を再送する (起動時の競合リカバリ)。
let activeChunkCount = 0;

export function setActiveSourceClientId(id: string | null): void {
  activeSourceClientId = id;
  activeChunkCount = 0;
}

// 新しいピア (chat_sync 側ブラウザ等) が接続完了したときに呼ばれるフック。
// rotator がこれに「送信元 MediaRecorder を再起動して keyframe を作り直す」処理を
// 登録する。werift/ffmpeg は copy 中継でエンコーダを持たず PLI に応答して keyframe を
// 生成できないため、後から参加したピアは送信元を再起動しないと最初の keyframe を
// 得られず黒画面のままになる。これを防ぐためのフック。
let onPeerConnected: (() => void) | null = null;

export function setOnPeerConnected(cb: (() => void) | null): void {
  onPeerConnected = cb;
}

// 現アクティブ送信元から受け取ったチャンク数を返す。
export function getActiveChunkCount(): number {
  return activeChunkCount;
}

// WebRTC セッションが起動中か (ffmpeg パイプラインが立っているか) を返す。
// initialize 経由の冪等起動 (ensureWebRtcSession) で使う。
export function isWebRtcSessionActive(): boolean {
  return ffmpegProc !== null;
}

export function feedWebMChunk(chunk: Buffer, fromId?: string): void {
  if (activeSourceClientId === null) return;
  if (fromId !== undefined && fromId !== activeSourceClientId) return;
  if (ffmpegProc?.stdin?.writable) {
    ffmpegProc.stdin.write(chunk);
    activeChunkCount++;
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

// 送出 RTP の seq/timestamp を chat_itsuki 側で書き直し、連続性を保証する。
// ffmpeg は (再)起動のたびにランダムな初期 seq/timestamp で始まるため、そのまま
// 中継すると ffmpeg 再起動 (新ピア接続時の keyframe 作り直し等) の瞬間に seq/ts が
// 不連続ジャンプする。接続直後にこれが起きると libwebrtc のジッタバッファが初期
// 確立に失敗し、フレームを1枚も emit できず framesReceived=0 / jitterBufferEmitted=0 /
// packetsLost 増加 / nackCount=0 のまま固着する (chat_sync 実測の症状と一致)。
// ここで出力 seq を常に連番、timestamp を常に単調増加に書き直すことで、ffmpeg の
// 再起動をブラウザから完全に隠蔽する。フレーム境界 (同一 srcTs を共有するパケット群)
// は維持し、フレーム間隔も元の timestamp 差をそのまま反映する。
let videoOutSeq = 0;
let videoOutTs = 0;
let videoLastSrcTs: number | null = null;
let videoRebase = true;
let audioOutSeq = 0;
let audioOutTs = 0;
let audioLastSrcTs: number | null = null;
let audioRebase = true;
// 再起動直後 (srcTs が不明な状態) に使うフレーム間隔の安全既定値。
const DEFAULT_VIDEO_TS_STEP = 3000; // 30fps 相当 (90kHz)
const DEFAULT_AUDIO_TS_STEP = 960; // Opus 20ms (48kHz)

// uint32 のラップを考慮した差分。
function ts32Diff(cur: number, prev: number): number {
  return (cur - prev) >>> 0;
}

// 送出 RTP の header.timestamp / sequenceNumber を連続値に書き直す (in-place)。
function rewriteOutgoingRtp(rtp: RtpPacket, kind: "video" | "audio"): void {
  const srcTs = rtp.header.timestamp >>> 0;
  if (kind === "video") {
    if (videoLastSrcTs === null) {
      // 初回パケット: outTs は初期値のまま据え置く。
    } else if (videoRebase) {
      // ffmpeg 再起動直後: 直前フレームの次に来るよう 1 フレーム分だけ進める。
      videoOutTs = (videoOutTs + DEFAULT_VIDEO_TS_STEP) >>> 0;
    } else {
      let delta = ts32Diff(srcTs, videoLastSrcTs);
      // 同一フレーム内なら delta=0 (outTs 据え置き)。異常ジャンプは既定値で保護。
      if (delta > 90000 * 5) delta = DEFAULT_VIDEO_TS_STEP;
      videoOutTs = (videoOutTs + delta) >>> 0;
    }
    videoRebase = false;
    videoLastSrcTs = srcTs;
    rtp.header.timestamp = videoOutTs;
    rtp.header.sequenceNumber = videoOutSeq;
    videoOutSeq = (videoOutSeq + 1) & 0xffff;
  } else {
    if (audioLastSrcTs === null) {
      // 初回
    } else if (audioRebase) {
      audioOutTs = (audioOutTs + DEFAULT_AUDIO_TS_STEP) >>> 0;
    } else {
      let delta = ts32Diff(srcTs, audioLastSrcTs);
      if (delta > 48000 * 5) delta = DEFAULT_AUDIO_TS_STEP;
      audioOutTs = (audioOutTs + delta) >>> 0;
    }
    audioRebase = false;
    audioLastSrcTs = srcTs;
    rtp.header.timestamp = audioOutTs;
    rtp.header.sequenceNumber = audioOutSeq;
    audioOutSeq = (audioOutSeq + 1) & 0xffff;
  }
}

export async function restartFfmpegSubprocess(): Promise<void> {
  await stopFfmpegSubprocess();
  // 再起動後の最初のパケットで seq/ts を連続値へリベースする。
  videoRebase = true;
  audioRebase = true;
  videoLastSrcTs = null;
  audioLastSrcTs = null;
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

// VP8 RTP payload (RFC7741) を解析し、フレーム先頭パケットなら keyframe 種別を返す。
// 戻り値: "key"=キーフレーム / "inter"=Pフレーム / null=フレーム先頭でない/解析不可。
// 「フレームの最初のパーティション開始 (S=1 かつ partition index 0)」のパケットだけ
// VP8 payload header の P ビット (bit0, 0=keyframe) を見る。
function inspectVp8(payload: Buffer): "key" | "inter" | null {
  if (payload.length < 1) return null;
  const b0 = payload[0];
  const sBit = (b0 & 0x10) !== 0;
  const partId = b0 & 0x07;
  if (!sBit || partId !== 0) return null;
  let offset = 1;
  if ((b0 & 0x80) !== 0) {
    // X=1: 拡張制御バイトあり
    if (payload.length < offset + 1) return null;
    const b1 = payload[offset];
    offset += 1;
    const hasPid = (b1 & 0x80) !== 0; // I
    const hasTl0 = (b1 & 0x40) !== 0; // L
    const hasTid = (b1 & 0x20) !== 0; // T
    const hasKeyIdx = (b1 & 0x10) !== 0; // K
    if (hasPid) {
      if (payload.length < offset + 1) return null;
      const isLongPid = (payload[offset] & 0x80) !== 0; // M
      offset += isLongPid ? 2 : 1;
    }
    if (hasTl0) offset += 1;
    if (hasTid || hasKeyIdx) offset += 1;
  }
  if (payload.length < offset + 1) return null;
  const pBit = (payload[offset] & 0x01) !== 0;
  return pBit ? "inter" : "key";
}

function startFfmpegSubprocess(): void {
  if (ffmpegProc) return;

  let videoRtpRx = 0;
  let videoRtpErr = 0;
  let videoKeyframes = 0;
  // marker bit はフレーム終端を示す。デパケタイザはこれでフレーム境界を確定する。
  // marker が一切立たない (videoRtpMarker が 0 のまま) と相手側は完全フレームを
  // 組み立てられず framesReceived=0 になる。frame=marker 数なので、200発ごとに
  // 「累計 marker 数」も出してフレーム境界が来ているか確認する。
  let videoRtpMarker = 0;
  let lastVideoTs = 0;
  videoUdp = dgram.createSocket("udp4");
  videoUdp.on("message", (msg) => {
    try {
      const rtp = RtpPacket.deSerialize(msg);
      const srcSeq = rtp.header.sequenceNumber;
      const srcTs = rtp.header.timestamp;
      // VP8 種別判定は payload を見るだけなので書き直し前でも後でも同じ。
      const vp8kind = inspectVp8(rtp.payload);
      // ★ ffmpeg の seq/ts を連続値へ書き直してから werift に渡す。
      rewriteOutgoingRtp(rtp, "video");
      videoTrack?.writeRtp(rtp);
      videoRtpRx++;
      if (rtp.header.marker) videoRtpMarker++;
      if (vp8kind === "key") {
        videoKeyframes++;
        console.log(
          `[werift tx] VP8 KEYFRAME #${videoKeyframes} ` +
            `outSeq=${rtp.header.sequenceNumber} outTs=${rtp.header.timestamp}`,
        );
      }
      // 最初の 40 発はフレーム単位で詳細に出す (chat_sync へ実数を渡すため)。
      // out* = 書き直し後 (ブラウザが実際に受け取る値) / src* = ffmpeg 生の値。
      // dts = 直前パケットからの out timestamp 差。新フレームで >0、同一フレーム
      //   内フラグメントなら 0。連番 outSeq・単調増加 outTs になっていれば成功。
      if (videoRtpRx <= 40 || videoRtpRx % 200 === 0) {
        const p = rtp.payload;
        const desc = p.subarray(0, Math.min(4, p.length)).toString("hex");
        const dts = ts32Diff(rtp.header.timestamp, lastVideoTs);
        console.log(
          `[werift tx] video #${videoRtpRx} ` +
            `outSeq=${rtp.header.sequenceNumber} outTs=${rtp.header.timestamp} dts=${dts} ` +
            `marker=${rtp.header.marker} markers=${videoRtpMarker} ` +
            `len=${p.length} desc=${desc} (srcSeq=${srcSeq} srcTs=${srcTs})`,
        );
      }
      lastVideoTs = rtp.header.timestamp;
    } catch (e) {
      videoRtpErr++;
    }
  });
  videoUdp.bind(RTP_VIDEO_PORT, "127.0.0.1");

  let audioRtpRx = 0;
  let audioRtpErr = 0;
  audioUdp = dgram.createSocket("udp4");
  audioUdp.on("message", (msg) => {
    try {
      const rtp = RtpPacket.deSerialize(msg);
      const srcSeq = rtp.header.sequenceNumber;
      const srcTs = rtp.header.timestamp;
      rewriteOutgoingRtp(rtp, "audio");
      audioTrack?.writeRtp(rtp);
      audioRtpRx++;
      if (audioRtpRx <= 5 || audioRtpRx % 500 === 0) {
        console.log(
          `[werift tx] audio #${audioRtpRx} ` +
            `outSeq=${rtp.header.sequenceNumber} outTs=${rtp.header.timestamp} ` +
            `(srcSeq=${srcSeq} srcTs=${srcTs})`,
        );
      }
    } catch (e) {
      audioRtpErr++;
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
    // video: VP8 再エンコード → RTP。
    // copy 中継は「ffmpeg が入力VP8のキーフレームを待ってから出力開始する」ため、
    // 送信元ブラウザ(/pi)のキーフレーム供給タイミングに依存する。Windows Chrome の
    // MediaRecorder は接続時フックでの再起動後にキーフレームを出すのが遅く、video が
    // 数秒間まったく送出されない (sender stats:video packets=0) 問題が発生した。
    // libvpx で再エンコードし -g で定期キーフレームを強制注入すれば、ffmpeg 自身が
    // ~1.5秒ごとにキーフレームを刻むので、送信元ブラウザ(Mac/Windows等)のタイミングに
    // 一切依存せず、接続時の再起動フックも不要になる (= setOnPeerConnected を無効化)。
    "-map", "0:v:0",
    "-c:v", "libvpx",
    "-b:v", "800k",
    "-deadline", "realtime",
    "-cpu-used", "8",
    // 出力 20fps を明示固定。-probesize 32 / -analyzeduration 0 の極小プローブだと
    // ffmpeg が入力フレームレートを検出できず出力 PTS が壊れる (1フレーム=1ms 等) ため。
    "-r", "20",
    "-vsync", "cfr",
    "-g", "30", // 約1.5秒ごと (20fps) に keyframe
    "-keyint_min", "30",
    "-error-resilient", "1",
    "-payload_type", String(PT_VIDEO),
    "-flush_packets", "1",
    "-max_delay", "0",
    // ★ -pkt_size 1200: RTP パケットを 1200 バイト以下に分割する (出力オプション形式)。
    // ffmpeg 既定 (~1460B) のままだと、RTPヘッダ + VP8 descriptor + IP/UDP + DTLS-SRTP
    // 認証タグ + TURN チャネルのオーバーヘッドを足すと chat.knd.cloud 経由 (TURN リレー)
    // の実効 MTU (~1200) を超え、大きいパケットが破棄される。すると分割された
    // キーフレームが永久に完成せず framesReceived=0 / packetsLost 増加 /
    // jitterBufferEmitted=0 になる。native libwebrtc も ~1200B 以下に揃えている。
    "-pkt_size", "1200",
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

  // ffmpeg の stderr は通常バナー/進捗で埋まるため出さないが、error/fatal 級の
  // 行だけは拾ってログする。pkt_size 等のオプション不正や probe 失敗で ffmpeg が
  // 無言で死ぬと送信が tx=0 になり原因が見えないため。
  ffmpegProc.stderr?.setEncoding("utf8");
  ffmpegProc.stderr?.on("data", (chunk: string) => {
    for (const line of chunk.split(/\r?\n/)) {
      if (/error|invalid|fail|unable|could not|no such/i.test(line)) {
        console.error(`[ffmpeg] ${line.trim()}`);
      }
    }
  });

  ffmpegProc.on("error", (err) => {
    console.error(`[ffmpeg] spawn error: ${err.message}`);
  });

  ffmpegProc.on("close", (code, signal) => {
    if (code !== 0 && code !== null) {
      console.error(`[ffmpeg] exited code=${code} signal=${signal}`);
    }
    ffmpegProc = null;
    videoUdp?.close(); videoUdp = null;
    audioUdp?.close(); audioUdp = null;
  });
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

// SDP の指定 kind ("audio"/"video") の m-line と関連する
// direction / rtpmap / fmtp / ssrc を抜粋して log する内部ヘルパ。
function logSdpKindLines(
  label: string,
  kind: "audio" | "video",
  sdp: string | undefined,
): void {
  if (!sdp) {
    console.log(`${label} ${kind} (no sdp)`);
    return;
  }
  const lines = sdp.split(/\r?\n/);
  let inKind = false;
  const out: string[] = [];
  for (const line of lines) {
    if (line.startsWith("m=")) {
      inKind = line.startsWith(`m=${kind}`);
      if (inKind) out.push(line);
    } else if (inKind && (
      line.startsWith("a=sendrecv") ||
      line.startsWith("a=sendonly") ||
      line.startsWith("a=recvonly") ||
      line.startsWith("a=inactive") ||
      line.startsWith("a=rtpmap") ||
      line.startsWith("a=fmtp") ||
      line.startsWith("a=rtcp-fb") ||
      line.startsWith("a=extmap") ||
      line.startsWith("a=ssrc") ||
      line.startsWith("a=mid")
    )) {
      out.push(line);
    }
  }
  console.log(`${label} ${kind}:\n  ${out.join("\n  ")}`);
}

// audio / video 両方の m-line をまとめて log する。
// video 側は前面/背面カメラで実際にネゴシエートされたコーデック (VP8/H264) を
// 確認するために重要 (werift は VP8 のみ対応のため H264 だと映像が流れない)。
function logSdpAudioLines(label: string, sdp: string | undefined): void {
  logSdpKindLines(label, "video", sdp);
  logSdpKindLines(label, "audio", sdp);
  logSdpTransportLines(label, sdp);
}

// BUNDLE / rtcp-mux / DTLS setup など、音声・映像が共通で通る「トランスポート層」の
// ネゴシエーション結果を抜粋する。これらが壊れていると、RTP は届くのに browser が
// 音声・映像のどちらのデコーダにも振り分けられず framesReceived=0・無音になる。
// (これまで m-line ごとの kind フィルタで a=group:BUNDLE / a=rtcp-mux を取りこぼしていた)
function logSdpTransportLines(label: string, sdp: string | undefined): void {
  if (!sdp) return;
  const out: string[] = [];
  for (const line of sdp.split(/\r?\n/)) {
    if (
      line.startsWith("m=") ||
      line.startsWith("a=group") ||
      line.startsWith("a=rtcp-mux") ||
      line.startsWith("a=rtcp:") ||
      line.startsWith("a=setup") ||
      line.startsWith("a=mid") ||
      line.startsWith("a=bundle-only") ||
      line.startsWith("a=msid-semantic") ||
      line.startsWith("a=extmap-allow-mixed")
    ) {
      out.push(line);
    }
  }
  console.log(`${label} transport:\n  ${out.join("\n  ")}`);
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
          // rtcp-fb を明示ネゴすることで SDP に a=rtcp-fb:96 nack / nack pli /
          // ccm fir が出る。これがないとブラウザが PLI/NACK を送っても未ネゴ機能
          // 扱いになり nackCount=0 のまま keyframe 要求が成立しない。
          rtcpFeedback: [
            { type: "nack" },
            { type: "nack", parameter: "pli" },
            { type: "ccm", parameter: "fir" },
            { type: "goog-remb" },
          ],
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

    // 受信側 (相手→chat_itsuki) の RTP 流量を可視化する。
    // 相手が H264 でエンコードして送ってくると werift は VP8 専用 recorder で
    // depacketize できず映像が出ない。RTP は届くのに映像にならない場合は
    // コーデック不一致を疑う (SDP video の rtpmap を併せて確認)。
    let rxCount = 0;
    let lastRxTs = 0;
    track.onReceiveRtp.subscribe((rtp) => {
      rxCount++;
      if (rxCount <= 8 || rxCount % 200 === 0) {
        // 受信(browser→itsuki, 動いている方向)の VP8 descriptor を送信側と
        // 同フォーマットで出し、ffmpeg 出力(送信側)と libwebrtc 出力(受信側)の
        // descriptor / timestamp 進行を直接比較できるようにする。
        const p = rtp.payload;
        const desc = p
          .subarray(0, Math.min(4, p.length))
          .toString("hex");
        const dts = rtp.header.timestamp - lastRxTs;
        console.log(
          `[werift rx] ${track.kind} RTP #${rxCount} ` +
            `seq=${rtp.header.sequenceNumber} ts=${rtp.header.timestamp} dts=${dts} ` +
            `marker=${rtp.header.marker} len=${p.length} desc=${desc}`,
        );
      }
      lastRxTs = rtp.header.timestamp;
    });

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

  let keyframeRefreshed = false;
  p.connectionStateChange.subscribe((state) => {
    console.log("[werift] connection state:", state);
    // 新しいピアが接続完了したら、送信元 MediaRecorder を再起動して keyframe を
    // 作り直す。ピアは接続前から流れていた mid-stream な VP8 を受け取っても
    // keyframe が無いとデコードできず黒画面になるため (werift は copy 中継で
    // PLI に応答した keyframe を生成できない)。PC ごとに 1 回だけ実行する。
    if (state === "connected" && !keyframeRefreshed) {
      keyframeRefreshed = true;
      onPeerConnected?.();
    }
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
