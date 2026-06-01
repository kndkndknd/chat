# WebRTC

> 最終更新: 2026-06-01。本書が WebRTC 実装の正本(single source of truth)。
> **2026-06 改修**: WebRTC ピアの役割を **backend(werift + ffmpeg)から `/webrtc` ブラウザ
> 自身へ移行**した。backend は WebRTC メディアに関与しなくなり、`/webrtc` 端末の Chrome が
> chat_sync の素のブラウザピアとして直接通話する。
> E2E 検証手順は [`WebRTC-E2E.md`](./WebRTC-E2E.md) を参照。

## 概要

chat_itsuki の WebRTC は、**URL パスが `/webrtc` のブラウザ(Windows + Google Chrome,
Alder Lake-N100 想定)が、対向の chat_sync(`https://github.com/kndkndknd/chat_sync`)へ
ブラウザネイティブ WebRTC で直接 P2P 通話する**構成。

- シグナリングは chat_sync の `/ws`(WebSocket)へ**直接**つなぎ、`join`/`offer`/`answer`/
  `ice-candidate` を chat_sync の JSON プロトコルで交換する。chat_sync は**無改変**。
- メディア(映像・音声)はブラウザの `RTCPeerConnection` が DTLS-SRTP で直接やり取りする
  (TURN 経由含む)。backend の ffmpeg / werift / MediaRecorder 中継 / MSE 再生は**全廃**。
- `/webrtc` 端末は chat_sync 上で **`itsuki-` で始まる特権ピア**として振る舞う。これにより
  営業時間ゲートをバイパスし、かつ在席することで一般来場者ブラウザの入室を許可する。

> **歴史的経緯**: 旧構成は backend の werift がピアで、`/pi` ブラウザの MediaRecorder が出力する
> WebM を backend の ffmpeg で VP8 再エンコード→RTP 化→werift→chat_sync へ中継し、受信は werift
> 内蔵 recorder→WebM→WebSocket→ブラウザ MSE 再生していた。共有 MediaRecorder の脆さ・libvpx
> 再エンコードの CPU 負荷・TURN MTU・並行動作時の黒画面など多くの不具合を抱えていたため、
> chat_sync のブラウザピアと同等の**素のブラウザ WebRTC** に移行した。旧構成のコード
> (`weriftClient.ts` / `cameraRotator.ts` / `msePlayback.ts` / `recording/`)は撤去済み。

---

## ファイル構成

```
packages/frontend/src/webRTC/
├── syncClient.ts     # chat_sync の WebRTC ピア (中核)。SyncClient クラス
└── syncConfig.ts     # 接続先 URL / ICE サーバ / ルーム ID / itsuki プレフィックス

packages/frontend/src/
├── main.ts           # /webrtc のとき SyncClient を起動 (起動配線)
├── vite-env.d.ts     # import.meta.env.VITE_CHAT_SYNC_URL の型
└── state/webRtcState.ts  # videoPlayer/audioPlayer/isConnected を保持

packages/frontend/.env.example   # VITE_CHAT_SYNC_URL の設定例

packages/backend/src/webRTC/
└── index.ts          # ※別機能: chat_itsuki 内ブラウザ間シグナリングリレー (本書の対象外)
```

> backend の `webRTC/index.ts` は chat_itsuki 内のブラウザ同士を仲介する旧来のシグナリング
> リレーで、chat_sync 連携とは無関係。今回の移行では触っていない。

---

## 全体パイプライン図

```
[/webrtc ブラウザ (Chrome / N100)]              [chat_sync backend]        [対向ブラウザ iPhone/Android/Win/Mac]
initialize.ts が getUserMedia
  (streamState.stream = 640x360/20fps, 共有)
  → SyncClient が streamState.stream の track を addTrack
  → wss(CHAT_SYNC_WS_URL)へ直接 join (peerId="itsuki-xxxx")
  → offer/answer/ice-candidate ───────────────►  1:1 リレー  ───────────────►  setRemoteDescription / answer
  ◄════════════════ DTLS-SRTP / TURN(coturn) で P2P メディア ════════════════►
  ontrack → remoteStream.addTrack
         → <video #remoteVideo>.srcObject = remoteStream (前面化 z-index:10)
```

ストリームは installation 用途(canvas 描画・音響合成)と**共有**。SyncClient は
`addTrack` で送信に乗せるだけで、getUserMedia を二重に呼ばない。

---

## 1. SyncClient (`webRTC/syncClient.ts`)

chat_sync の `frontend/src/webrtc.ts` (`WebRTCClient`) を移植・改変した中核クラス。

### ライフサイクル

| メソッド | 役割 |
|---|---|
| `constructor()` | `peerId = ITSUKI_PEER_PREFIX + 乱数6桁` を生成(再接続を跨いで維持) |
| `start()` | `streamState.stream` を最大 ~10 秒(250ms×40)待ってから `connect()`。stream 未取得なら諦めてログ出力 |
| `stop()` | `leave` 送信 → PC/WS クローズ → リモート映像クリア。`stopRequested` で再接続抑止 |

### シグナリング処理(`handleServerMessage`)

| msg.type | 処理 |
|---|---|
| `joined` | ログのみ |
| `peer-joined`(自分が先着 = **offerer**) | `initPeerConnection()` → `remotePeerId` セット → `createAndSendOffer()` |
| `peer-ready`(自分が後着 = **answerer**) | `initPeerConnection()` → `remotePeerId` セット(early ICE 候補を保持するため PC を先に作る) |
| `offer` | (未生成なら)`initPeerConnection()` → `setRemoteDescription` → `flushPendingCandidates` → `createAnswer` → `answer` 送信 |
| `answer` | `setRemoteDescription` → `flushPendingCandidates` |
| `ice-candidate` | `remoteDescription` あり → 即 `addIceCandidate` / 無ければ `pendingCandidates` にバッファ |
| `peer-left` | `closePeerConnection()` + リモート映像クリア。次の `peer-joined`/`peer-ready` を待つ |
| `room-full` / `not-available` / `closed` | 警告ログのみ(itsuki ピアでは通常発生しない) |

> `closePeerConnection()` は `remotePeerId` を**意図的に保持**する(`initPeerConnection()` が
> 本関数を呼ぶため、ここで消すと「remotePeerId セット → init で null」になり offer 送信が空振りする)。
> chat_sync 版の修正をそのまま踏襲。

### PeerConnection(`initPeerConnection`)

- `new RTCPeerConnection({ iceServers: ICE_SERVERS })`。
- `streamState.stream` の全 track を `addTrack`(共有 640x360/20fps)。
- `onicecandidate` → `remotePeerId` 宛に `ice-candidate` 送信。
- `ontrack` → **shared `remoteStream` に全 track(audio+video)を集約** → `attachRemoteVideo()`。
- `onconnectionstatechange` → `webRtcState.isConnected` を更新。

### 受信メディアの表示(`attachRemoteVideo`)

- `webRtcState.videoPlayer`(= `<video id="remoteVideo">`)の `srcObject` に `remoteStream` を割当て、
  `play()` を呼ぶ。**音声もこの `<video>` 要素から再生される**(video+audio 両 track を 1 stream に集約)。
- 通話中だけ `z-index:10` で canvas 前面に出し、`peer-left`/停止時に解除して CSS 本来の重なり順へ戻す。
- 旧 `<audio id="remoteAudio">` 要素は SyncClient では未使用(MSE 時代の名残)。

### 自動再接続

WS の `close`/`error` で `scheduleReconnect()` が指数バックオフ(1s→2s→…→30s 上限)で再接続し、
再接続後に再 `join` する。`peerId` は維持。`stop()`(`stopRequested=true`)時は抑止。

| 定数 | 値 |
|---|---|
| `STREAM_WAIT_INTERVAL_MS` / `STREAM_WAIT_MAX` | `250ms` / `40`(約10秒) |
| `RECONNECT_BASE_MS` / `RECONNECT_MAX_MS` | `1000ms` / `30_000ms` |
| `VIDEO_FRONT_Z_INDEX` | `"10"` |

### 診断ログ

`[syncClient] starting as itsuki-… / connected to chat_sync: … / <- <msgtype> /
ice state: … / pc state: … / remote track: <kind> (<n> total) / reconnecting in …ms`。

---

## 2. 設定 (`webRTC/syncConfig.ts`)

| 公開定数 | 内容 |
|---|---|
| `CHAT_SYNC_WS_URL` | 接続先シグナリング WS(後述の解決ルール) |
| `ROOM_ID` | `"chat sync"`(chat_sync の固定 1 ルームと一致) |
| `ITSUKI_PEER_PREFIX` | `"itsuki-"`(chat_sync の特権ピア。**外すと対向ブラウザも入室不可**) |
| `ICE_SERVERS` | Google STUN + 自前 STUN + 自前 TURN(udp/tcp)+ TURN over TLS(`turns:5349`) |

### `CHAT_SYNC_WS_URL` の解決(`resolveChatSyncWsUrl`)

ビルド時環境変数 `VITE_CHAT_SYNC_URL`(`packages/frontend/.env.example` 参照)で切替:

| `VITE_CHAT_SYNC_URL` | 結果 |
|---|---|
| 未設定 | 本番デフォルト `wss://chat.knd.cloud/ws` |
| `"same-origin"` | 配信元と同一オリジンの `/ws`(`${wss}://${location.host}/ws`)。リバースプロキシ / LAN 検証用 |
| その他(完全 URL) | その URL を直接使用(本番の別オリジン直結) |

> **same-origin の用途**: chat_sync を同一オリジンの `/ws` にリバースプロキシして検証する場合、
> 端末が LAN / Tailscale など複数経路で到達しても「開いた URL のホスト」へ繋ぐため、接続先
> ホスト不一致(ビルド固定 IP に届かない)を避けられる。本番(別オリジン直結)では URL を直指定する。

### ICE / TURN

`TURN_HOST` は `CHAT_SYNC_WS_URL` のホスト名から導出。認証は `webrtc` / `webrtcpass`
(chat_sync・coturn と一致)。`turns:${TURN_HOST}:5349?transport=tcp` は出先 NW で UDP/TCP 3478 が
塞がれている場合のフォールバック。同一 LAN なら host candidate で直結し TURN 不要。

---

## 3. 起動配線 (`main.ts`)

```
window.location.pathname.includes("webrtc") のとき:
  1) flagState.start でなければ initialize() を自動起動 (クリック/Enter を待たない)
       → getUserMedia (640x360/20fps) → streamState.stream をセット
  2) new SyncClient().start()   // streamState.stream を内部でリトライ待ちしてから接続
```

`/webrtc` 以外のパス(`/`, `/pi`, `/counter` 等)では SyncClient を起動せず、従来の
installation 機能だけが動く。

> **無人運用の前提**: ロード時の自動 `getUserMedia` / autoplay は、ブラウザにカメラ・マイク
> 権限が永続許可されていること(キオスク設定)に依存する。権限ダイアログを伴う環境では、
> 画面を一度タップ/クリックして `initialize()` を発火させる必要がある。

---

## 4. chat_sync 連携契約

chat_sync は**無改変**で、以下の契約に依存する(詳細は chat_sync の `document/chat_sync.md`)。

| 項目 | 内容 |
|---|---|
| ルーム上限 | 1 ルーム最大 **2 ピア**。`/webrtc` が itsuki スロットを 1 つ占有するため、**同時接続する `/webrtc` は 1 台のみ**(2 台目は `room-full`) |
| 役割割り当て | 在室順。先着=offerer(`peer-joined`)、後着=answerer(`peer-ready`)。SyncClient は両役割を実装し、再接続での役割反転にも耐える |
| `itsuki-required` | chat_sync は itsuki 不在の room に一般ブラウザを入れない(`not-available`)。`/webrtc` が `itsuki-` 在席することで来場者の入室を許可する |
| 営業時間 | 一般ブラウザは営業時間外 `closed`。`itsuki-` ピアと `?debug=<token>` はバイパス |
| コーデック | ブラウザ同士のネゴに委ねる(VP8/VP9/H264/AV1)。werift の VP8 制約は撤廃 |
| msid 集約 | chat_sync 側 `ontrack` は shared stream に集約済み。本クライアントも全 track を 1 stream に集約 |

---

## 5. 既知の制約 / 注意

- **`/webrtc` は 1 台のみ**(room 上限 2)。複数台繋ぐと `room-full`。
- **`itsuki-` プレフィックス死活的**。変更すると chat_sync が `not-available` / `closed` を返し、対向も繋がらない。
- **共有ストリーム**: `streamState.stream` を installation と共有。installation 側でストリームを止める経路があると送信も止まる。
- **自動起動の gesture 制約**: 権限未許可 / autoplay ブロック環境ではワンタップが要る(上記)。
- **TURN-over-TLS**: chat_sync フロントと揃えて `turns:5349` を含む。LAN 直結時は host candidate で TURN 不要。
- **後発接続**: room が 2 ピア埋まっていると新規入室は `room-full`。1:1 通話前提。

---

## 6. 検証

E2E 手順(ローカル Path B / 本番 Path A / シグナリング smoke test)は
[`WebRTC-E2E.md`](./WebRTC-E2E.md) を参照。ヘッドレス Chrome(fake media)+ ローカル
chat_sync で「join → 役割分配 → offer/answer/ICE → 双方向トラック → connected」までを
再現でき、実機ブラウザ(Mac/Chrome ↔ 別端末)での双方向映像・音声も確認済み。
