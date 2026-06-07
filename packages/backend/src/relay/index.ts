// /webrtc 受信映像のリレー (中継) シグナリング転送。
//
// /webrtc 端末 (sender) が chat_sync から受信した remoteStream を、同じ
// chat_itsuki 配下の receiver 端末 (最大 relayState.maxReceivers 台) へ
// ブラウザ間 P2P で中継する。本モジュールはその offer/answer/ice を
// IoFacade で宛先へそのまま転送するだけのシグナリング中継役。
//
// 既存の webRTC/index.ts (chat_itsuki 内ブラウザ間シグナリング) とは状態も
// イベント名も分離しており、互いに干渉しない。

import { relayState } from "../state/states/relayState";
import { ioState } from "../state/states/ioState";

// receiver 登録時に sender へ既存の自分を知らせ、sender 登録時には在室中の
// receiver 一覧を sender へ通知して接続を張り直させる。
export const registerRelay = (
  role: "sender" | "receiver",
  id: string
): void => {
  if (role === "sender") {
    relayState.senderId = id;
    console.log("relay sender registered:", id);
    // 既に待機中の receiver がいれば、sender に join 済みとして通知して
    // PC を張らせる (sender が後から起動したケース)。
    relayState.receivers.forEach((receiverId) => {
      ioState?.io
        .to(id)
        .emit("relayReceiverJoinedFromServer", { receiverId });
    });
    return;
  }

  // role === "receiver"
  if (relayState.receivers.size >= relayState.maxReceivers) {
    console.log("relay room full, reject receiver:", id);
    ioState?.io.to(id).emit("relayRoomFullFromServer");
    return;
  }
  relayState.receivers.add(id);
  console.log("relay receiver registered:", id, "total:", relayState.receivers.size);
  // sender が在室していれば、新規 receiver を通知して offer を作らせる。
  if (relayState.senderId) {
    ioState?.io
      .to(relayState.senderId)
      .emit("relayReceiverJoinedFromServer", { receiverId: id });
  }
};

export const relayOffer = (
  to: string,
  offer: RTCSessionDescriptionInit,
  fromId: string
): void => {
  ioState?.io.to(to).emit("relayOfferFromServer", { from: fromId, offer });
};

export const relayAnswer = (
  to: string,
  answer: RTCSessionDescriptionInit,
  fromId: string
): void => {
  ioState?.io.to(to).emit("relayAnswerFromServer", { from: fromId, answer });
};

export const relayIce = (
  to: string,
  candidate: RTCIceCandidateInit,
  fromId: string
): void => {
  ioState?.io.to(to).emit("relayIceFromServer", { from: fromId, candidate });
};

// ws 切断時のクリーンアップ。sender なら全 receiver へ通知して状態リセット、
// receiver なら一覧から外して sender へ通知する。
export const handleRelayDisconnect = (id: string): void => {
  if (relayState.senderId === id) {
    console.log("relay sender gone:", id);
    relayState.senderId = null;
    relayState.receivers.forEach((receiverId) => {
      ioState?.io.to(receiverId).emit("relaySenderGoneFromServer");
    });
    return;
  }
  if (relayState.receivers.has(id)) {
    relayState.receivers.delete(id);
    console.log("relay receiver left:", id, "total:", relayState.receivers.size);
    if (relayState.senderId) {
      ioState?.io
        .to(relayState.senderId)
        .emit("relayReceiverLeftFromServer", { receiverId: id });
    }
  }
};
