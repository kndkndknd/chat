// chat_sync の WebRTC ピアとしてブラウザ自身が振る舞うクライアント。
//
// 旧構成では backend (werift + ffmpeg) が chat_sync のピアだったが、本クライアントは
// chat_sync の frontend/src/webrtc.ts (WebRTCClient) と同等の「素のブラウザ WebRTC」
// ピアを /webrtc 端末上で動かす。シグナリングは chat_sync の /ws へ直接つなぎ、
// join/offer/answer/ice-candidate を chat_sync の JSON プロトコルで交換する。
//
// chat_itsuki 向けの改変点:
//   - getUserMedia は呼ばず、initialize.ts が取得済みの streamState.stream を再利用する。
//   - peerId は ITSUKI_PEER_PREFIX 始まり (chat_sync の特権ピア)。
//   - 受信は ontrack の MediaStream をそのまま <video remoteVideo> に流す (MSE 不要)。
//   - 無人運用のため WS 切断 / peer-left で自動再接続・再 join する。

import { streamState, webRtcState } from "../state";
import {
  CHAT_SYNC_WS_URL,
  ICE_SERVERS,
  ITSUKI_PEER_PREFIX,
  LOCAL_SEND_ROTATION_DEG,
  REMOTE_DISPLAY_ROTATION_DEG,
  ROOM_ID,
} from "./syncConfig";
import { createRotatedSendStream, type RotatedStream } from "./rotateStream";

interface SdpDescription {
  type: RTCSdpType;
  sdp?: string;
}

interface IceCandidateData {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}

type ServerMessage =
  | { type: "joined"; peerId: string; roomId: string }
  | { type: "peer-joined"; peerId: string } // offerer 役: PC を作ってオファーを送る
  | { type: "peer-ready"; peerId: string } // answerer 役: PC を作ってオファーを待つ
  | { type: "peer-left"; peerId: string }
  | { type: "room-full" }
  | { type: "not-available" }
  | { type: "closed" }
  | { type: "offer"; sdp: SdpDescription; from: string }
  | { type: "answer"; sdp: SdpDescription; from: string }
  | { type: "ice-candidate"; candidate: IceCandidateData; from: string };

type ClientMessage =
  | { type: "join"; roomId: string; peerId: string }
  | { type: "offer"; sdp: SdpDescription; to: string; from: string }
  | { type: "answer"; sdp: SdpDescription; to: string; from: string }
  | { type: "ice-candidate"; candidate: IceCandidateData; to: string; from: string }
  | { type: "leave"; peerId: string };

// 通話中だけリモート映像を canvas より前面に出す z-index (旧 msePlayback.ts と同値)。
const VIDEO_FRONT_Z_INDEX = "10";

// streamState.stream 準備待ちのリトライ (initialize.ts 完了前に start された場合)。
const STREAM_WAIT_INTERVAL_MS = 250;
const STREAM_WAIT_MAX = 40; // 約 10 秒

// シグナリング WS の自動再接続 (SocketFacade と同じ指数バックオフ)。
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;

function log(msg: string): void {
  console.log("[syncClient]", msg);
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export class SyncClient {
  private ws: WebSocket | null = null;
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  // chat_sync へ送る回転済みストリーム (実機の 270 度設置を補正)。
  private sendStream: MediaStream | null = null;
  private rotated: RotatedStream | null = null;
  private remoteStream = new MediaStream();
  private remotePeerId: string | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];

  // 再接続制御
  private stopRequested = false;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly peerId: string;

  constructor() {
    // chat_sync のログでブラウザクライアントと区別できるよう itsuki- を前置する。
    this.peerId = ITSUKI_PEER_PREFIX + Math.random().toString(36).slice(2, 8);
  }

  // ロード時に呼ぶ。streamState.stream が用意できるまで待ってから接続する。
  async start(): Promise<void> {
    this.stopRequested = false;
    const stream = await this.waitForStream();
    if (!stream) {
      console.warn("[syncClient] stream not ready; gave up starting WebRTC");
      return;
    }
    this.localStream = stream;
    // 実機カメラは 270 度回転設置なので、送出前に映像を回転させた track を用意する。
    // PC 再接続をまたいで使い回すため、ここで一度だけ生成する。
    this.rotated = createRotatedSendStream(stream, LOCAL_SEND_ROTATION_DEG);
    this.sendStream = this.rotated.stream;
    log(`starting as ${this.peerId}`);
    this.connect();
  }

  stop(): void {
    this.stopRequested = true;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.send({ type: "leave", peerId: this.peerId });
    this.closePeerConnection();
    this.remotePeerId = null;
    this.ws?.close();
    this.ws = null;
    this.clearRemoteVideo();
    this.rotated?.stop();
    this.rotated = null;
    this.sendStream = null;
  }

  private async waitForStream(): Promise<MediaStream | null> {
    for (let i = 0; i < STREAM_WAIT_MAX; i++) {
      if (streamState.stream) return streamState.stream as MediaStream;
      await delay(STREAM_WAIT_INTERVAL_MS);
    }
    return (streamState.stream as MediaStream | null) ?? null;
  }

  // ---- シグナリング ----

  private connect(): void {
    this.ws = new WebSocket(CHAT_SYNC_WS_URL);

    this.ws.onopen = () => {
      log("connected to chat_sync: " + CHAT_SYNC_WS_URL);
      this.reconnectAttempt = 0;
      this.send({ type: "join", roomId: ROOM_ID, peerId: this.peerId });
    };

    this.ws.onmessage = (event: MessageEvent<string>) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(event.data) as ServerMessage;
      } catch {
        console.error("[syncClient] invalid JSON from chat_sync");
        return;
      }
      this.handleServerMessage(msg).catch((err: unknown) => {
        console.error(
          "[syncClient] message handling error:",
          err instanceof Error ? err.message : String(err),
        );
      });
    };

    this.ws.onclose = () => {
      log("disconnected from chat_sync");
      this.scheduleReconnect();
    };
    this.ws.onerror = () => {
      // close も発火するので再接続は close 側に任せる。
      console.warn("[syncClient] WebSocket error");
    };
  }

  private scheduleReconnect(): void {
    if (this.stopRequested) return;
    if (this.reconnectTimer !== null) return;

    // 既存 PC / 候補をクリア (再接続後は別ピアになる可能性がある)。
    this.closePeerConnection();
    this.remotePeerId = null;
    this.pendingCandidates = [];

    const d = Math.min(
      RECONNECT_BASE_MS * 2 ** this.reconnectAttempt,
      RECONNECT_MAX_MS,
    );
    this.reconnectAttempt++;
    log(`reconnecting in ${d}ms (attempt ${this.reconnectAttempt})`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.stopRequested) return;
      this.connect();
    }, d);
  }

  private async handleServerMessage(msg: ServerMessage): Promise<void> {
    log("<- " + msg.type);
    switch (msg.type) {
      case "joined":
        break;

      case "room-full":
        // itsuki スロットを誰かが占有済み。再接続で復帰を試みる。
        console.warn("[syncClient] room is full");
        break;

      case "not-available":
        console.warn("[syncClient] not-available (unexpected for itsuki peer)");
        break;

      case "closed":
        console.warn("[syncClient] closed (unexpected for itsuki peer)");
        break;

      case "peer-joined":
        // 先に在室していた = OFFERER。
        // initPeerConnection() が remotePeerId をリセットするので順序に注意。
        this.initPeerConnection();
        this.remotePeerId = msg.peerId;
        await this.createAndSendOffer();
        break;

      case "peer-ready":
        // 後着 = ANSWERER。早着 ICE 候補を取りこぼさないよう PC をここで先に作る。
        this.initPeerConnection();
        this.remotePeerId = msg.peerId;
        break;

      case "peer-left":
        this.closePeerConnection();
        this.remotePeerId = null;
        this.clearRemoteVideo();
        // 同一 WS セッションで別ピアが入れば chat_sync が peer-joined / peer-ready を
        // 再送するので、そのハンドラで PC を作り直す。
        break;

      case "offer": {
        // 通常は peer-ready で PC 作成済み。順序が前後したときのみ作成する
        // (既存 PC があるのに initPeerConnection を呼ぶと早着候補を失うため)。
        if (!this.pc) this.initPeerConnection();
        this.remotePeerId = msg.from;
        await this.pc!.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        await this.flushPendingCandidates();
        const answer = await this.pc!.createAnswer();
        await this.pc!.setLocalDescription(answer);
        this.send({ type: "answer", sdp: answer, to: msg.from, from: this.peerId });
        break;
      }

      case "answer":
        await this.pc!.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        await this.flushPendingCandidates();
        break;

      case "ice-candidate": {
        const cand = msg.candidate;
        if (this.pc?.remoteDescription) {
          await this.pc.addIceCandidate(new RTCIceCandidate(cand));
        } else {
          this.pendingCandidates.push(cand);
        }
        break;
      }
    }
  }

  private async flushPendingCandidates(): Promise<void> {
    for (const c of this.pendingCandidates.splice(0)) {
      await this.pc!.addIceCandidate(new RTCIceCandidate(c));
    }
  }

  // ---- PeerConnection ----

  private initPeerConnection(): void {
    this.closePeerConnection();
    this.pendingCandidates = [];
    this.remoteStream = new MediaStream();

    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // 回転済みストリーム (270 度回転 video + 元 audio) の track を送信に乗せる。
    const outStream = this.sendStream ?? this.localStream;
    if (outStream) {
      for (const track of outStream.getTracks()) {
        this.pc.addTrack(track, outStream);
      }
    }

    this.pc.onicecandidate = ({ candidate }) => {
      if (!candidate || !this.remotePeerId) return;
      this.send({
        type: "ice-candidate",
        candidate: { ...candidate.toJSON(), candidate: candidate.candidate ?? "" },
        to: this.remotePeerId,
        from: this.peerId,
      });
    };

    this.pc.ontrack = ({ track }) => {
      // video / audio 両 track を 1 つの MediaStream に集約して <video> に流す
      // (werift と違い msid は付くが、両 track を同一 stream に乗せる方針は踏襲)。
      this.remoteStream.addTrack(track);
      this.attachRemoteVideo();
      log(`remote track: ${track.kind} (${this.remoteStream.getTracks().length} total)`);
    };

    this.pc.oniceconnectionstatechange = () => {
      const state = this.pc?.iceConnectionState ?? "unknown";
      log("ice state: " + state);
    };

    this.pc.onconnectionstatechange = () => {
      const state = this.pc?.connectionState ?? "unknown";
      log("pc state: " + state);
      webRtcState.isConnected = state === "connected";
    };
  }

  private async createAndSendOffer(): Promise<void> {
    if (!this.pc || !this.remotePeerId) return;
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.send({ type: "offer", sdp: offer, to: this.remotePeerId, from: this.peerId });
  }

  private closePeerConnection(): void {
    this.pc?.close();
    this.pc = null;
    webRtcState.isConnected = false;
    // remotePeerId はここではリセットしない (initPeerConnection が本関数を呼ぶため、
    // ここで消すと remotePeerId セット → init → null になり offer 送信が空振りする)。
  }

  // ---- リモート映像の <video> 反映 ----

  private attachRemoteVideo(): void {
    const el = webRtcState.videoPlayer;
    if (!el) return;
    if (el.srcObject !== this.remoteStream) {
      el.srcObject = this.remoteStream;
    }
    el.style.zIndex = VIDEO_FRONT_Z_INDEX; // 通話中は canvas 前面
    // 実機ディスプレイは 270 度回転設置なので、受信映像を 90 度回転して正立させる。
    el.style.transform = `rotate(${REMOTE_DISPLAY_ROTATION_DEG}deg)`;
    void el.play().catch((e) =>
      console.warn("[syncClient] remote video autoplay blocked:", e),
    );
  }

  private clearRemoteVideo(): void {
    this.remoteStream = new MediaStream();
    const el = webRtcState.videoPlayer;
    if (!el) return;
    el.srcObject = null;
    el.style.removeProperty("z-index"); // CSS 本来の重なり順に戻す
    el.style.removeProperty("transform"); // 回転も解除
  }

  private send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }
}
