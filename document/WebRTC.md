# WebRTC

## 概要

バックエンドはWebRTCに関して2つの独立した役割を持つ。

1. **シグナリングリレー** (`webRTC/index.ts`) — ブラウザクライアント間のWebRTC接続確立を仲介する
2. **weriftクライアント** (`webRTC/weriftClient.ts`) — バックエンド自身がWebRTCピアとしてchat_syncサーバーに接続し、映像・音声を送受信する

---

## ファイル構成

```
packages/backend/src/webRTC/
├── index.ts          # シグナリングリレー関数群
└── weriftClient.ts   # バックエンドのWebRTCクライアント実装
```

---

## 1. シグナリングリレー (`webRTC/index.ts`)

ブラウザクライアント間のWebRTC接続確立に必要なシグナリングメッセージをサーバー経由でリレーする。接続先管理には `webRtcServerState` を使用する。

### 状態

`state/states/webRtcServerState.ts` で管理。

```
webRtcServerState.roomId   固定ルームID
webRtcServerState.rooms    ルーム → メンバーSetのMap
webRtcServerState.member   現在のメンバーID配列
```

### 関数

#### `joinOrLeave(type, id)`

クライアントをルームに参加・退室させる。

- **JOIN**: ルームが存在しなければ作成。参加クライアントに `candidateReqFromServer`（現メンバー一覧）を送信。既存メンバーには `joinInfoFromServer`（新規参加者のID）を通知。
- **LEAVE**: ルームからクライアントを削除。残存メンバーに `leaveInfoFromServer`（退室者のID）を通知。
- Snow Leopardクライアントは参加不可（エラーメッセージを返す）。

#### `offerReq(id)`

指定クライアントに `offerRequestFromServer` を送信し、Offerの生成を要求する。

#### `answerReq(id)`

指定クライアントに `answerReqFromServer` を送信し、Answerの生成を要求する。

#### `iceCandidateEmit(candidate, id)`

送信元（`id`）以外の全メンバーに `iceCandidateFromServer` を転送する。

#### `offerEmit(offer, id)`

送信元（`id`）以外の全メンバーに `offerFromServer`（`{ offer, sourceId }`）を転送する。

#### `answerEmit(answer, targetId)`

`targetId` が現メンバーに含まれる場合のみ `answerFromServer` を送信する。

> **現状**: `execCmd.ts` で `joinOrLeave` と `offerReq` がimportされているが、該当コマンド処理はコメントアウトされており未使用。

---

## 2. weriftクライアント (`webRTC/weriftClient.ts`)

バックエンドがNode.js用WebRTCライブラリ `werift` を使ってピアとして動作し、ブラウザから受け取ったWebM映像・音声をリモートピアへ送信する。受信したRTPはブロードキャストで全クライアントへ配信する。

### 定数

| 定数 | 値 | 説明 |
|---|---|---|
| `ROOM_ID` | `"chat sync"` | chat_syncサーバーのルームID |
| `CHAT_SYNC_URL` | `ws://localhost:3000` | シグナリングサーバーURL（環境変数 `CHAT_SYNC_URL` で上書き可） |
| `RTP_VIDEO_PORT` | `5004` | ffmpegが出力するVP8 RTP UDPポート |
| `RTP_AUDIO_PORT` | `5006` | ffmpegが出力するOpus RTP UDPポート |
| `PT_VIDEO` | `96` | VP8のRTPペイロードタイプ |
| `PT_AUDIO` | `111` | OpusのRTPペイロードタイプ |

### 公開API

#### `startWebRTCSession()`

セッションを開始する。すでに起動済みの場合は何もしない。

1. `startFfmpegPipeline()` — ffmpegプロセスとUDPソケットを起動
2. `connectToChatSync()` — chat_syncサーバーへWebSocket接続

`receiveEnter.ts` でコマンド `CALL` が入力されたときに呼ばれる。

```
"CALL" コマンド
  → receiveEnter.ts
    → startWebRTCSession()
    → io.emit("bufferRecReqFromServer")  // クライアントへ録画開始を要求
```

#### `stopWebRTCSession()`

セッションを停止し、全リソース（ffmpeg、UDPソケット、PeerConnection、WebSocket）を解放する。

#### `feedWebMChunk(chunk)`

ブラウザから受け取ったWebMチャンクをffmpegのstdinへ書き込む。

呼び出し元:
- `socket/ioServer.ts` — `bufferFromClient` イベント（Socket.IO）
- `socket/wsServer.ts` — `bufferFromClient` メッセージ（ネイティブWebSocket）

---

### 内部処理フロー

#### 送信方向（ブラウザ → リモートピア）

```
ブラウザ
  │  bufferFromClient (ArrayBuffer: WebMチャンク)
  ▼
ioServer.ts / wsServer.ts
  │  feedWebMChunk(chunk)
  ▼
ffmpegプロセス (stdin)
  │  WebM (VP8+Opus) をRTPに変換
  ├─► UDP :5004  VP8 RTPパケット
  │     videoUdp.on("message") → RtpPacket.deSerialize() → videoTrack.writeRtp()
  └─► UDP :5006  Opus RTPパケット
        audioUdp.on("message") → RtpPacket.deSerialize() → audioTrack.writeRtp()
              │
              ▼
        RTCPeerConnection (werift)
              │  WebRTCでリモートピアへ送信
              ▼
        リモートピア (chat_sync経由で接続)
```

#### 受信方向（リモートピア → 全クライアント）

```
リモートピア
  │  WebRTCでRTPパケット受信
  ▼
RTCPeerConnection.ontrack
  │  track.onReceiveRtp.subscribe()
  ▼
io.emit("rtpFromServer", { source: "RTP", kind, rtp: ArrayBuffer })
  │  ブロードキャスト
  ▼
全クライアント
```

#### シグナリング（chat_syncとのWebSocket通信）

```
startWebRTCSession()
  │
  └─ connectToChatSync()
       │  ws.on("open") → send({ type: "join", roomId: "chat sync", peerId })
       │
       ├─ "joined"      → ログ出力のみ
       ├─ "peer-joined" → [Offerer側] buildPeerConnection() → createOffer() → send offer
       ├─ "peer-ready"  → [Answerer側] buildPeerConnection() → offer待機
       ├─ "offer"       → setRemoteDescription() → createAnswer() → send answer
       ├─ "answer"      → setRemoteDescription()
       ├─ "ice-candidate" → addIceCandidate()（未接続時はpendingCandidatesへ保存）
       ├─ "peer-left"   → PeerConnection クローズ
       └─ "room-full"   → ログ出力のみ
```

`pendingCandidates` に溜まったICE候補は `setRemoteDescription` 完了後に `flushCandidates()` でまとめて適用する。

---

### RTCPeerConnection設定

`buildPeerConnection()` で生成。

| 項目 | 値 |
|---|---|
| STUNサーバー | `stun:stun.l.google.com:19302` |
| 映像コーデック | VP8 / clockRate 90000 / PT 96 |
| 音声コーデック | Opus / clockRate 48000 / stereo / PT 111 |
| トランシーバー方向 | `sendrecv`（送受信両方） |

映像トラックの最初のRTP受信時に `sendRtcpPLI()` でキーフレームをリクエストする。

---

## WebSocketイベント一覧

### サーバー → クライアント（WebRTC関連）

| イベント名 | ペイロード | 説明 |
|---|---|---|
| `rtpFromServer` | `{ source: "RTP", kind: "video"\|"audio", rtp: ArrayBuffer }` | リモートピアから受信したRTPパケット（全クライアントへブロードキャスト） |
| `candidateReqFromServer` | `string[]` | JOIN時に現在のメンバーID一覧を送信 |
| `joinInfoFromServer` | `string` | 新規参加者のIDを既存メンバーへ通知 |
| `leaveInfoFromServer` | `string` | 退室者のIDを残存メンバーへ通知 |
| `offerRequestFromServer` | なし | Offer生成をクライアントへ要求 |
| `answerReqFromServer` | なし | Answer生成をクライアントへ要求 |
| `iceCandidateFromServer` | `RTCIceCandidateInit` | ICE候補を転送 |
| `offerFromServer` | `{ offer: RTCSessionDescriptionInit, sourceId: string }` | Offerを転送 |
| `answerFromServer` | `RTCSessionDescription` | Answerを転送 |
| `bufferRecReqFromServer` | なし | `CALL` コマンド実行時にクライアントへ録画開始を要求 |

### クライアント → サーバー（WebRTC関連）

| イベント名 | ペイロード | 説明 |
|---|---|---|
| `bufferFromClient` | `ArrayBuffer` | WebMチャンク。ffmpegに渡してRTPに変換後、リモートピアへ送信 |
