// /webrtc 端末が chat_sync から受信した映像を、他の receiver 端末へ中継する
// (relay) ためのサーバ側状態。送信元は 1 台 (senderId)、receiver は最大 maxReceivers 台。
// シグナリングは chat_itsuki 自前の /ws (IoFacade) を経由する。
export const relayState = {
  senderId: null as string | null,
  receivers: new Set<string>(),
  maxReceivers: 3,
};
