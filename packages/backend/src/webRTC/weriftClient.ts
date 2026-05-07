import WebSocket from "ws";
import * as dgram from "dgram";
import { spawn, ChildProcess } from "child_process";
import {
  RTCPeerConnection,
  RTCRtpCodecParameters,
  MediaStream,
  MediaStreamTrack,
  RtpPacket,
} from "werift";
import { ioState } from "../state/states/ioState";

const ROOM_ID = "chat sync";
const CHAT_SYNC_URL = process.env.CHAT_SYNC_URL ?? "ws://localhost:3000";
const RTP_VIDEO_PORT = 5004;
const RTP_AUDIO_PORT = 5006;
// Payload types must match what ffmpeg outputs for VP8/Opus RTP
const PT_VIDEO = 96;
const PT_AUDIO = 111;

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

export function startWebRTCSession(): void {
  if (ffmpegProc) {
    console.log("[werift] session already active");
    return;
  }
  startFfmpegPipeline();
  connectToChatSync();
}

export function stopWebRTCSession(): void {
  ffmpegProc?.stdin?.end();
  ffmpegProc?.kill("SIGTERM");
  ffmpegProc = null;
  videoUdp?.close(); videoUdp = null;
  audioUdp?.close(); audioUdp = null;
  pc?.close(); pc = null;
  ws?.close(); ws = null;
  videoTrack = null;
  audioTrack = null;
  pendingCandidates = [];
  console.log("[werift] session stopped");
}

export function feedWebMChunk(chunk: Buffer): void {
  if (ffmpegProc?.stdin?.writable) {
    ffmpegProc.stdin.write(chunk);
  }
}

// ---- ffmpeg pipeline ----

function startFfmpegPipeline(): void {
  videoTrack = new MediaStreamTrack({ kind: "video" });
  audioTrack = new MediaStreamTrack({ kind: "audio" });

  videoUdp = dgram.createSocket("udp4");
  videoUdp.on("message", (msg) => {
    try {
      const rtp = RtpPacket.deSerialize(msg);
      videoTrack?.writeRtp(rtp);
    } catch (_) {}
  });
  videoUdp.bind(RTP_VIDEO_PORT, "127.0.0.1");

  audioUdp = dgram.createSocket("udp4");
  audioUdp.on("message", (msg) => {
    try {
      const rtp = RtpPacket.deSerialize(msg);
      audioTrack?.writeRtp(rtp);
    } catch (_) {}
  });
  audioUdp.bind(RTP_AUDIO_PORT, "127.0.0.1");

  // WebM (VP8+Opus) from stdin → VP8 RTP on :5004, Opus RTP on :5006
  ffmpegProc = spawn("ffmpeg", [
    "-fflags", "+nobuffer",
    "-analyzeduration", "0",
    "-probesize", "32",
    "-i", "pipe:0",
    // video: VP8 copy → RTP
    "-map", "0:v:0",
    "-c:v", "copy",
    "-payload_type", String(PT_VIDEO),
    "-f", "rtp",
    `rtp://127.0.0.1:${RTP_VIDEO_PORT}`,
    // audio: Opus copy → RTP
    "-map", "0:a:0",
    "-c:a", "copy",
    "-payload_type", String(PT_AUDIO),
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

// ---- signaling ----

function connectToChatSync(): void {
  myPeerId = Math.random().toString(36).slice(2, 8);
  ws = new WebSocket(CHAT_SYNC_URL);

  ws.on("open", () => {
    console.log("[werift] connected to chat_sync:", CHAT_SYNC_URL);
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
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        send({ type: "offer", sdp: pc.localDescription, to: remotePeerId, from: myPeerId });
        break;
      }

      case "peer-ready":
        // New peer joined → we are the ANSWERER, wait for offer
        remotePeerId = msg.peerId as string;
        pc = buildPeerConnection();
        break;

      case "offer": {
        if (!pc) pc = buildPeerConnection();
        await pc.setRemoteDescription(msg.sdp as RTCSessionDescriptionInit);
        await flushCandidates();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        send({ type: "answer", sdp: pc.localDescription, to: msg.from, from: myPeerId });
        break;
      }

      case "answer":
        await pc!.setRemoteDescription(msg.sdp as RTCSessionDescriptionInit);
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
        break;

      case "room-full":
        console.log("[werift] room is full");
        break;
    }
  });

  ws.on("close", () => console.log("[werift] disconnected from chat_sync"));
  ws.on("error", (err: Error) => console.error("[werift] WebSocket error:", err.message));
}

// ---- RTCPeerConnection ----

function buildPeerConnection(): RTCPeerConnection {
  if (!videoTrack || !audioTrack) {
    throw new Error("[werift] tracks not initialized — call startWebRTCSession first");
  }

  const p = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
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
  p.addTransceiver(videoTrack, { direction: "sendrecv", streams: [stream] });
  p.addTransceiver(audioTrack, { direction: "sendrecv", streams: [stream] });

  p.ontrack = ({ track, transceiver }) => {
    console.log("[werift] track received:", track.kind);
    track.onReceiveRtp.once(() => {
      if (track.kind === "video") {
        transceiver.receiver.sendRtcpPLI(track.ssrc!);
      }
    });
    track.onReceiveRtp.subscribe((rtp: RtpPacket) => {
      ioState?.io.emit("rtpFromServer", {
        source: "RTP",
        kind: track.kind,
        rtp: rtp.serialize().buffer,
      });
    });
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
