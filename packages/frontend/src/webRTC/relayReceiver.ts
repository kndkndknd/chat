// /webrtc 受信映像のリレー受信側 (relay receiver、URL: /relay)。
//
// /webrtc 端末 (relay sender) が chat_sync から受信して中継する映像+音声を、
// chat_itsuki 自前の /ws (socketState.socket) 経由でシグナリングして受け取り、
// <video #remoteVideo> に表示する。カメラ/マイクは使わない (getUserMedia 不要)。
//
// 接続フロー:
//   1. relayRegisterFromClient {role:"receiver"} を送信して receiver 登録。
//   2. sender から relayOfferFromServer が届いたら PC を作って answer を返す。
//   3. ontrack で受信した映像+音声を <video> に流す。
//   4. sender 切断 (relaySenderGoneFromServer) / WS 切断で映像をクリアし待機。
//      SocketFacade が自動再接続し connected で再登録するので接続は自動復帰する。

import { socketState, webRtcState } from "../state";
import { ICE_SERVERS } from "./syncConfig";
import {
  applyMaxVideoLayout,
  clearVideoLayout,
  hideVideo,
  showVideo,
} from "./remoteVideoLayout";

interface SdpDescription {
  type: RTCSdpType;
  sdp?: string;
}

function log(msg: string): void {
  console.log("[relayReceiver]", msg);
}

export class RelayReceiver {
  private pc: RTCPeerConnection | null = null;
  private senderId: string | null = null;
  private remoteStream = new MediaStream();
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;
    const socket = socketState.socket;
    if (!socket) {
      console.warn("[relayReceiver] socket not ready");
      return;
    }

    socket.on("relayOfferFromServer", (data) => {
      const { from, offer } = data as { from: string; offer: SdpDescription };
      void this.onOffer(from, offer);
    });
    socket.on("relayIceFromServer", (data) => {
      const { candidate } = data as {
        from: string;
        candidate: RTCIceCandidateInit;
      };
      void this.onRemoteIce(candidate);
    });
    socket.on("relaySenderGoneFromServer", () => {
      log("sender gone");
      this.teardown();
    });
    socket.on("relayRoomFullFromServer", () => {
      console.warn("[relayReceiver] relay room full (max receivers reached)");
    });

    // connected は (再)接続のたびに発火する。再接続時の再登録もこれで賄える。
    socket.on("connected", () => this.register());
    // 既に接続済みなら今後 connected は発火しないので一度登録する。
    this.register();
  }

  private register(): void {
    log("register as receiver");
    socketState.socket?.emit("relayRegisterFromClient", { role: "receiver" });
  }

  private async onOffer(from: string, offer: SdpDescription): Promise<void> {
    log("offer from " + from);
    this.senderId = from;
    // 新しい offer が来たら作り直す (sender 再接続などに対応)。
    this.pc?.close();
    this.pendingCandidates = [];
    this.remoteStream = new MediaStream();

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.pc = pc;

    pc.onicecandidate = ({ candidate }) => {
      if (!candidate || !this.senderId) return;
      socketState.socket?.emit("relayIceFromClient", {
        to: this.senderId,
        candidate: candidate.toJSON(),
      });
    };

    pc.ontrack = ({ track }) => {
      this.remoteStream.addTrack(track);
      this.attachRemoteVideo();
      // sender が中継を止めて track が終了したら、最後のフレームが残らないよう
      // 表示を初期化する (ended は恒久的な終了。瞬断では発火しない)。
      track.onended = () => {
        if (this.pc === pc) this.teardown();
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

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      log("pc state: " + state);
      // 現アクティブな PC のイベントだけ反映する (sender 再接続で差し替わった
      // 古い PC の遅延イベント対策)。
      if (this.pc !== pc) return;
      webRtcState.isConnected = state === "connected";
      // 中継終了 (failed/closed) で最後のフレームが残らないよう表示を初期化する。
      // disconnected は一時的に復帰し得るのでここでは消さない。
      if (state === "failed" || state === "closed") {
        this.teardown();
      }
    };

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    await this.flushPendingCandidates();
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socketState.socket?.emit("relayAnswerFromClient", { to: from, answer });
  }

  private async onRemoteIce(candidate: RTCIceCandidateInit): Promise<void> {
    if (this.pc?.remoteDescription) {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } else {
      this.pendingCandidates.push(candidate);
    }
  }

  private async flushPendingCandidates(): Promise<void> {
    if (!this.pc) return;
    for (const c of this.pendingCandidates.splice(0)) {
      await this.pc.addIceCandidate(new RTCIceCandidate(c));
    }
  }

  private attachRemoteVideo(): void {
    const el = webRtcState.videoPlayer;
    if (!el) return;
    const isNewStream = el.srcObject !== this.remoteStream;
    if (isNewStream) {
      el.srcObject = this.remoteStream;
      // 最前面 + ウィンドウ範囲での最大表示 (全面)。中継映像は実機回転設置に
      // 依らないため回転は付けない (rotationDeg = 0)。
      applyMaxVideoLayout(el);
    }
    // 中継映像は音声も鳴らす (sender 側で増幅済みの音声をそのまま再生)。
    el.muted = false;
    void el.play().catch((e) =>
      console.warn("[relayReceiver] remote video autoplay blocked:", e)
    );
  }

  private teardown(): void {
    this.pc?.close();
    this.pc = null;
    this.senderId = null;
    this.pendingCandidates = [];
    this.remoteStream = new MediaStream();
    webRtcState.isConnected = false;
    const el = webRtcState.videoPlayer;
    if (el) {
      el.srcObject = null;
      clearVideoLayout(el);
    }
  }
}
