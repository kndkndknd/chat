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
  REMOTE_AUDIO_GAIN,
  REMOTE_DISPLAY_ROTATION_DEG,
  ROOM_ID,
} from "./syncConfig";
import { createRotatedSendStream, type RotatedStream } from "./rotateStream";
import { RelayController } from "./relayController";
import {
  applyRandomVideoLayout,
  clearVideoLayout,
  hideVideo,
  showVideo,
} from "./remoteVideoLayout";

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

  // chat_sync から受信した remoteStream を他端末 (/relay) へ中継する。
  private relay = new RelayController();

  // 受信音声を 100% 超に増幅するための Web Audio グラフ
  // (MediaStreamSource -> GainNode -> DynamicsCompressor -> destination)。
  // 増幅で飽和した分はコンプレッサー (リミッター設定) で抑えて歪みを防ぐ。
  // <video> 自体はミュートし、音声はこの経路だけで鳴らして二重再生を防ぐ。
  private audioCtx: AudioContext | null = null;
  private remoteAudioSource: MediaStreamAudioSourceNode | null = null;
  private remoteGain: GainNode | null = null;
  private remoteCompressor: DynamicsCompressorNode | null = null;

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
    // 受信映像を他端末へ中継する relay sender を起動 (常時待受)。
    this.relay.start();
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
    this.relay.clearSource();
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
    // WS 切断時も最後のフレームが残らないよう表示を初期化する
    // (closePeerConnection が this.pc を null にした後に close イベントが届くため、
    //  状態ハンドラ側では拾えない。ここで明示的にクリアする)。
    this.clearRemoteVideo();
    this.relay.clearSource();

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
        // 中継元が消えたので relay の送信も止める (receiver 登録は維持)。
        this.relay.clearSource();
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
    // ハンドラ内では this.pc ではなくこのローカル参照を使う。再接続で this.pc が
    // 差し替わった後に古い PC の遅延イベントが発火しても、現行表示を壊さない。
    const pc = this.pc;

    // 回転済みストリーム (270 度回転 video + 元 audio) の track を送信に乗せる。
    const outStream = this.sendStream ?? this.localStream;
    if (outStream) {
      for (const track of outStream.getTracks()) {
        pc.addTrack(track, outStream);
      }
    }

    pc.onicecandidate = ({ candidate }) => {
      if (!candidate || !this.remotePeerId) return;
      this.send({
        type: "ice-candidate",
        candidate: { ...candidate.toJSON(), candidate: candidate.candidate ?? "" },
        to: this.remotePeerId,
        from: this.peerId,
      });
    };

    pc.ontrack = ({ track }) => {
      // video / audio 両 track を 1 つの MediaStream に集約して <video> に流す
      // (werift と違い msid は付くが、両 track を同一 stream に乗せる方針は踏襲)。
      this.remoteStream.addTrack(track);
      this.attachRemoteVideo();
      // 受信した映像+音声を他端末 (/relay) へも中継する。
      this.relay.setSourceStream(this.remoteStream);
      // 音声は <video> ではなく GainNode 経由で鳴らして +40% 増幅する。
      if (track.kind === "audio") this.setupAmplifiedAudio();
      // 相手が送信を止めて track が終了したら、最後のフレームが残らないよう初期化する
      // (ended は恒久的な終了。一時的な瞬断では発火しないので誤クリアにならない)。
      track.onended = () => {
        if (this.pc !== pc) return;
        this.clearRemoteVideo();
        this.relay.clearSource();
      };
      // 映像が止まった瞬間 (mute) はフリーズフレームを即座に隠す暫定クリア。
      // stream/PC は保持するため、unmute で同じ位置に即復帰する (瞬断対応)。
      if (track.kind === "video") {
        track.onmute = () => {
          if (this.pc !== pc) return;
          const el = webRtcState.videoPlayer;
          if (el) hideVideo(el);
        };
        track.onunmute = () => {
          if (this.pc !== pc) return;
          const el = webRtcState.videoPlayer;
          if (el) showVideo(el);
        };
      }
      log(`remote track: ${track.kind} (${this.remoteStream.getTracks().length} total)`);
    };

    pc.oniceconnectionstatechange = () => {
      log("ice state: " + pc.iceConnectionState);
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      log("pc state: " + state);
      // 現アクティブな PC のイベントだけ反映する (古い PC の遅延イベント対策)。
      if (this.pc !== pc) return;
      webRtcState.isConnected = state === "connected";
      // 通話終了 (failed/closed) で最後のフレームが残らないよう表示を初期化する。
      // disconnected は一時的に復帰し得るのでここでは消さない。
      if (state === "failed" || state === "closed") {
        this.clearRemoteVideo();
        this.relay.clearSource();
      }
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

  // ---- リモート音声の増幅再生 ----

  // 受信した音声 track を Web Audio の GainNode 経由で再生し、REMOTE_AUDIO_GAIN 倍に
  // 増幅する。HTMLMediaElement.volume は 1.0 が上限で 100% 超の増幅ができないため。
  // remoteStream は再接続のたびに作り直されるので、その都度ソースを張り直す。
  private setupAmplifiedAudio(): void {
    if (this.remoteStream.getAudioTracks().length === 0) return;
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }
    // 前の接続のグラフを破棄してから張り直す。
    this.remoteAudioSource?.disconnect();
    this.remoteGain?.disconnect();
    this.remoteCompressor?.disconnect();

    const source = this.audioCtx.createMediaStreamSource(this.remoteStream);
    const gain = this.audioCtx.createGain();
    gain.gain.value = REMOTE_AUDIO_GAIN;

    // 増幅で飽和したピークを抑えるリミッター設定のコンプレッサー。
    // threshold 付近から強い ratio で圧縮し、knee=0 でハードに頭打ちさせる。
    const compressor = this.audioCtx.createDynamicsCompressor();
    compressor.threshold.value = -3; // dB: これを超えた分を圧縮
    compressor.knee.value = 0; // ハードニー (リミッター的)
    compressor.ratio.value = 20; // 強い圧縮比でピークを頭打ち
    compressor.attack.value = 0.003; // 速く反応させてクリップを防ぐ
    compressor.release.value = 0.25;

    source.connect(gain).connect(compressor).connect(this.audioCtx.destination);
    this.remoteAudioSource = source;
    this.remoteGain = gain;
    this.remoteCompressor = compressor;

    // 自動再生ポリシーで suspended の場合に備えて resume する (キオスク前提)。
    void this.audioCtx.resume().catch(() => {
      /* gesture 待ちなどの一時失敗は無視 */
    });
  }

  private teardownAmplifiedAudio(): void {
    this.remoteAudioSource?.disconnect();
    this.remoteGain?.disconnect();
    this.remoteCompressor?.disconnect();
    this.remoteAudioSource = null;
    this.remoteGain = null;
    this.remoteCompressor = null;
  }

  // ---- リモート映像の <video> 反映 ----

  private attachRemoteVideo(): void {
    const el = webRtcState.videoPlayer;
    if (!el) return;
    const isNewStream = el.srcObject !== this.remoteStream;
    if (isNewStream) {
      el.srcObject = this.remoteStream;
      // 最前面 + ランダムなサイズ・位置。実機ディスプレイは 270 度回転設置なので
      // 受信映像を 270 度回転して正立させる (回転後の視覚サイズも考慮される)。
      applyRandomVideoLayout(el, REMOTE_DISPLAY_ROTATION_DEG);
    }
    // 音声は GainNode 経由 (setupAmplifiedAudio) で増幅再生するため、
    // <video> 自体はミュートして二重再生を防ぐ。
    el.muted = true;
    void el.play().catch((e) =>
      console.warn("[syncClient] remote video autoplay blocked:", e),
    );
  }

  private clearRemoteVideo(): void {
    this.teardownAmplifiedAudio();
    this.remoteStream = new MediaStream();
    const el = webRtcState.videoPlayer;
    if (!el) return;
    el.srcObject = null;
    clearVideoLayout(el);
  }

  private send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }
}
