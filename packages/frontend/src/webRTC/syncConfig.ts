// chat_sync シグナリング / TURN 設定。
//
// /webrtc ブラウザは chat_itsuki オリジンから配信されるが、WebRTC ピアとしては
// chat_sync (別ホスト) に直接つなぐ。そのため chat_sync 版のように
// location.hostname で coturn ホストを導出することはできず、明示的に
// chat_sync のホストを使う。ビルド時に VITE_CHAT_SYNC_URL で上書き可能。

const DEFAULT_CHAT_SYNC_WS_URL = "wss://chat.knd.cloud/ws";

// VITE_CHAT_SYNC_URL の解決:
//   未設定          → 本番デフォルト (wss://chat.knd.cloud/ws)
//   "same-origin"   → 配信元と同一オリジンの /ws を使う (リバースプロキシ/LAN 検証用)。
//                     端末が LAN/Tailscale など複数経路で到達しても、開いた URL の
//                     ホストにそのまま繋ぐので接続先不一致を避けられる。
//   それ以外        → その URL をそのまま使う (本番の別オリジン直結)
function resolveChatSyncWsUrl(): string {
  const raw = import.meta.env.VITE_CHAT_SYNC_URL;
  if (raw === "same-origin" && typeof location !== "undefined") {
    return `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`;
  }
  return raw ?? DEFAULT_CHAT_SYNC_WS_URL;
}

export const CHAT_SYNC_WS_URL = resolveChatSyncWsUrl();

// chat_sync の固定 1 ルーム ID (chat_sync 側 main.ts と一致させる)。
export const ROOM_ID = "chat sync";

// 実機はカメラ・ディスプレイを 270 度回転して設置している。そのため /webrtc 端末は
//   - 受信映像 (chat_sync → chat_itsuki) を表示時に 270 度回転させ、
//   - 送信映像 (chat_itsuki → chat_sync) を送出前に 270 度回転させる。
// いずれも時計回りを正とする (CSS / canvas の回転方向)。
export const REMOTE_DISPLAY_ROTATION_DEG = 270;
export const LOCAL_SEND_ROTATION_DEG = 270;

// chat_sync に特権ピア (itsuki) として認識されるためのプレフィックス。
// chat_sync は ROOM_MODE='itsuki-required' + 営業時間ゲートを持ち、
// peerId が "itsuki-" で始まるピアだけが時間外でも入室でき、かつ在席することで
// 一般来場者ブラウザの入室を許可する。これを外すと対向ブラウザも接続できない。
export const ITSUKI_PEER_PREFIX = "itsuki-";

function extractHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "chat.knd.cloud";
  }
}

const TURN_HOST = extractHost(CHAT_SYNC_WS_URL);
const TURN_USERNAME = "webrtc";
const TURN_CREDENTIAL = "webrtcpass";

// chat_sync フロントエンドと同等の ICE 構成。
// turns:5349 は出先ネットワークで UDP/TCP 3478 が塞がれている場合の
// TURN over TLS フォールバック (iPhone/Android のモバイル回線対策)。
export const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: `stun:${TURN_HOST}:3478` },
  {
    urls: `turn:${TURN_HOST}:3478`,
    username: TURN_USERNAME,
    credential: TURN_CREDENTIAL,
  },
  {
    urls: `turn:${TURN_HOST}:3478?transport=tcp`,
    username: TURN_USERNAME,
    credential: TURN_CREDENTIAL,
  },
  {
    urls: `turns:${TURN_HOST}:5349?transport=tcp`,
    username: TURN_USERNAME,
    credential: TURN_CREDENTIAL,
  },
];
