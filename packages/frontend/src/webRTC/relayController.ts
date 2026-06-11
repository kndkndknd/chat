// /webrtc 受信映像のリレー送信側 (relay sender)。
//
// /webrtc 端末が chat_sync から受信した remoteStream (SyncClient が ontrack で
// 集約する映像+音声) を、同じ chat_itsuki 配下の receiver 端末 (/relay) へ
// ブラウザ間 P2P で中継する。シグナリングは chat_itsuki 自前の /ws
// (socketState.socket = SocketFacade) を使い、chat_sync 系 (SyncClient) とは
// 完全に分離している。
//
// 接続フロー:
//   1. relayRegisterFromClient {role:"sender"} を送信して sender 登録。
//   2. receiver が /relay を開くと relayReceiverJoinedFromServer が届く。
//   3. その receiver 向けに RTCPeerConnection を張り、source の全 track を
//      addTrack して offer を送る (relayOfferFromClient)。
//   4. answer / ice を交互に処理して P2P 確立。

import { socketState } from "../state";
import { ICE_SERVERS } from "./syncConfig";

interface SdpDescription {
  type: RTCSdpType;
  sdp?: string;
}

function log(msg: string): void {
  console.log("[relaySender]", msg);
}

export class RelayController {
  private pcs = new Map<string, RTCPeerConnection>();
  private pendingCandidates = new Map<string, RTCIceCandidateInit[]>();
  // 接続要求のあった receiver。source 未到着時に join された場合に備えて覚えておき、
  // source が来たらまとめて offer を作る。
  private knownReceivers = new Set<string>();
  private sourceStream: MediaStream | null = null;
  private started = false;

  // ロード時に呼ぶ。シグナリングハンドラを張り、sender 登録する。
  start(): void {
    if (this.started) return;
    this.started = true;
    const socket = socketState.socket;
    if (!socket) {
      console.warn("[relaySender] socket not ready");
      return;
    }

    socket.on("relayReceiverJoinedFromServer", (data) => {
      const { receiverId } = data as { receiverId: string };
      this.onReceiverJoined(receiverId);
    });
    socket.on("relayAnswerFromServer", (data) => {
      const { from, answer } = data as { from: string; answer: SdpDescription };
      void this.onAnswer(from, answer);
    });
    socket.on("relayIceFromServer", (data) => {
      const { from, candidate } = data as {
        from: string;
        candidate: RTCIceCandidateInit;
      };
      void this.onRemoteIce(from, candidate);
    });
    socket.on("relayReceiverLeftFromServer", (data) => {
      const { receiverId } = data as { receiverId: string };
      this.onReceiverLeft(receiverId);
    });

    // connected ハンドラは (再)接続のたびに発火する (server が新規 ws ごとに
    // connected を送るため)。再接続時の再登録もこれで賄える。
    socket.on("connected", () => this.register());
    // 既に接続済みなら connected は今後発火しないので、ここで一度登録する
    // (未接続なら emit はドロップされ、上の connected ハンドラが登録を担う)。
    this.register();
  }

  // SyncClient が chat_sync から受け取った remoteStream を中継元として渡す。
  // ontrack のたび (video → audio) に呼ばれる。chat_sync 再接続では
  // remoteStream が作り直される (参照が変わる) ため、各 receiver を張り直す。
  setSourceStream(stream: MediaStream): void {
    this.sourceStream = stream;
    for (const receiverId of this.knownReceivers) {
      this.recreatePc(receiverId);
    }
  }

  // SyncClient の peer-left / stop でリレー元が消えたとき。
  clearSource(): void {
    this.sourceStream = null;
    for (const pc of this.pcs.values()) pc.close();
    this.pcs.clear();
    this.pendingCandidates.clear();
  }

  private register(): void {
    log("register as sender");
    socketState.socket?.emit("relayRegisterFromClient", { role: "sender" });
  }

  private onReceiverJoined(receiverId: string): void {
    log("receiver joined: " + receiverId);
    this.knownReceivers.add(receiverId);
    // source がまだ無ければ、到着時 (setSourceStream) に offer を作る。
    if (this.sourceStream) this.recreatePc(receiverId);
  }

  private onReceiverLeft(receiverId: string): void {
    log("receiver left: " + receiverId);
    this.knownReceivers.delete(receiverId);
    this.pcs.get(receiverId)?.close();
    this.pcs.delete(receiverId);
    this.pendingCandidates.delete(receiverId);
  }

  // 指定 receiver 向けの PC を (再)生成し、source の全 track を乗せて offer を送る。
  private recreatePc(receiverId: string): void {
    if (!this.sourceStream) return;
    this.pcs.get(receiverId)?.close();
    this.pendingCandidates.set(receiverId, []);

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.pcs.set(receiverId, pc);

    for (const track of this.sourceStream.getTracks()) {
      pc.addTrack(track, this.sourceStream);
    }

    pc.onicecandidate = ({ candidate }) => {
      if (!candidate) return;
      socketState.socket?.emit("relayIceFromClient", {
        to: receiverId,
        candidate: candidate.toJSON(),
      });
    };

    pc.onconnectionstatechange = () => {
      log(`pc(${receiverId}) state: ${pc.connectionState}`);
    };

    void this.createAndSendOffer(receiverId, pc);
  }

  private async createAndSendOffer(
    receiverId: string,
    pc: RTCPeerConnection
  ): Promise<void> {
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketState.socket?.emit("relayOfferFromClient", {
        to: receiverId,
        offer,
      });
    } catch (e) {
      console.error("[relaySender] offer error:", e);
    }
  }

  private async onAnswer(from: string, answer: SdpDescription): Promise<void> {
    const pc = this.pcs.get(from);
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
    await this.flushPendingCandidates(from, pc);
  }

  private async onRemoteIce(
    from: string,
    candidate: RTCIceCandidateInit
  ): Promise<void> {
    const pc = this.pcs.get(from);
    if (!pc) return;
    if (pc.remoteDescription) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } else {
      const buf = this.pendingCandidates.get(from) ?? [];
      buf.push(candidate);
      this.pendingCandidates.set(from, buf);
    }
  }

  private async flushPendingCandidates(
    from: string,
    pc: RTCPeerConnection
  ): Promise<void> {
    const buf = this.pendingCandidates.get(from);
    if (!buf) return;
    for (const c of buf.splice(0)) {
      await pc.addIceCandidate(new RTCIceCandidate(c));
    }
  }
}
