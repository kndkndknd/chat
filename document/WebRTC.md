# WebRTC

> 最終更新: 2026-05-31。本書が WebRTC 実装の正本(single source of truth)。
> 直近の修正(MTU 対策 `-pkt_size 1200`、VP8 再エンコード、`/pi` 固定化、
> seq/ts 書き直し)を反映済み。

## 概要

バックエンドはWebRTCに関して3つの独立した役割を持つ。

1. **シグナリングリレー** (`webRTC/index.ts`) — ブラウザクライアント間のWebRTC接続確立を仲介する
2. **weriftクライアント** (`webRTC/weriftClient.ts`) — バックエンド自身がWebRTCピアとしてchat_syncサーバーに接続し、映像・音声を送受信する
3. **カメラセレクタ** (`webRTC/cameraRotator.ts`) — 送信元のブラウザクライアントを `/pi`(`urlPathName` に "pi" を含む端末)に固定する

送信方向(chat_itsuki → chat_sync)が主役。`/pi` ブラウザの MediaRecorder が出力する
WebM チャンクを backend の ffmpeg で VP8 再エンコード + Opus copy して RTP 化し、werift
経由で chat_sync ピアへ送る。chat_itsuki が **offerer**、chat_sync が **answerer**。

受信側 (sync ピア → バックエンド) は werift 内蔵の `MediaRecorder` で RTP を直接 WebM Cluster に変換し、WebSocket チャンクとしてブラウザへ配信、ブラウザ側で MSE (MediaSource Extensions) を使って `<video>` / `<audio>` でライブ再生する。ffmpeg → werift → sync ピアに流れるストリームは常に 1 系統。

> **歴史的経緯**: 以前は送信元を全ブラウザクライアントから 20 秒ごとに巡回切替し、
> ffmpeg は `-c:v copy`(再エンコードなし)だった。しかし
> (a) TURN 経由で ffmpeg 既定の ~1460B RTP が MTU 超過で破棄され映像が出ない、
> (b) `-c:v copy` は入力 VP8 キーフレームを待つためソース依存で黒画面になる、
> という 2 つの不具合のため、**`/pi` 固定 + libvpx 再エンコード + `-pkt_size 1200`** に
> 変更した(詳細は末尾「解決済み不具合」)。

---

## ファイル構成

```
packages/backend/src/webRTC/
├── index.ts          # シグナリングリレー関数群
├── weriftClient.ts   # バックエンドのWebRTCクライアント実装
└── cameraRotator.ts  # 送信元クライアントを /pi に固定するセレクタ

packages/frontend/src/webRTC/
└── msePlayback.ts    # MSE による <video>/<audio> ライブ再生

packages/frontend/src/recording/
└── index.ts          # MediaRecorder で WebM チャンクを送信

packages/frontend/src/socket/
└── SocketFacade.ts   # 自動再接続つき WebSocket クライアント
```

---

## 全体パイプライン図(送信方向)

```
[/pi ブラウザ]                          [chat_itsuki backend (Node)]                [chat_sync ブラウザ]
getUserMedia(640x360/20fps)                                                          受信・デコード・描画
  → MediaRecorder (VP8/Opus WebM)
  → "bufferFromClient" (ArrayBuffer)──►  feedWebMChunk()
                                          (activeSourceClientId 一致時だけ通す)
                                       → ffmpeg stdin (pipe:0)
                                          VP8 再エンコード + Opus copy
                                       → RTP  udp 127.0.0.1:5004 (video PT96)
                                              udp 127.0.0.1:5006 (audio PT111)
                                       → werift が UDP 受信 → seq/ts 書き直し
                                       → RTCRtpSender.writeRtp
                                       → DTLS/SRTP → TURN ───────────────────────►  表示
```

---

## 1. シグナリングリレー (`webRTC/index.ts`)

ブラウザクライアント間のWebRTC接続確立に必要なシグナリングメッセージをサーバー経由でリレーする。接続先管理には `webRtcServerState` を使用する。

(変更なし。詳細は省略 — 旧実装と同じ)

---

## 2. 送信元(`/pi` ブラウザ / `recording/index.ts`)

`getUserMedia` のストリーム(`streamState.stream`、解像度/fps は `initialize.ts` の
getUserMedia 制約で **640x360 / 20fps**)を **1 つの共有 `MediaRecorder`** で録画する。

| 項目 | 値 |
|---|---|
| MIME | `video/webm;codecs=vp8,opus` |
| `videoBitsPerSecond` | `800_000`(800kbps) |
| `audioBitsPerSecond` | `32_000`(32kbps、会話用途) |
| timeslice | `1000ms`(`mediaRecorder.start(1000)`) |

- `ondataavailable` ごとに `ArrayBuffer` 化し `socket.emit("bufferFromClient", buf)` で backend へ送る。
- 開始: socket イベント `bufferRecReqFromServer`。`streamState.stream` 準備前に届く
  競合に備え、最大約 10 秒(250ms × 40 回)リトライしてから `startChunkedRecording()`
  を呼ぶ。二重起動防止として `state === "recording"` なら即 return。
- 停止: `bufferRecStopFromServer`(`stopChunkedRecording()` + 受信 MSE リセット)/
  `recorderSwitchStopFromServer`(MediaRecorder だけ停止、MSE は維持)。

> ⚠️ この `MediaRecorder` と `streamState.stream` は **インスタレーション用途と
> chat_sync 送信用途で共有**されている。`stopChunkedRecording()` を呼ぶ経路が複数
> あるため、文脈を確認せず止めると chat_sync 送信も止まる(末尾「既知の脆さ」参照)。

---

## 3. weriftクライアント (`webRTC/weriftClient.ts`)

バックエンドがNode.js用WebRTCライブラリ `werift` を使ってピアとして動作する。

- **送信方向**: `/pi` の MediaRecorder が出力する WebM チャンクを ffmpeg で **VP8 再エンコード + Opus copy** し、RTP として werift の `MediaStreamTrack` に流し込んで sync ピアへ送る。
- **受信方向**: sync ピアからの RTP を werift 内蔵の `MediaRecorder` で WebM (Cluster + SimpleBlock) にし、WebSocket でブラウザへ配信する。

### 定数

| 定数 | 値 | 説明 |
|---|---|---|
| `ROOM_ID` | `"chat sync"` | chat_syncサーバーのルームID |
| `CHAT_SYNC_URL` | `wss://localhost:3000/ws` | シグナリングサーバーURL（環境変数 `CHAT_SYNC_URL` で上書き可） |
| `RTP_VIDEO_PORT` | `5004` | ffmpegが出力するVP8 RTP UDPポート |
| `RTP_AUDIO_PORT` | `5006` | ffmpegが出力するOpus RTP UDPポート |
| `PT_VIDEO` | `96` | VP8のRTPペイロードタイプ |
| `PT_AUDIO` | `111` | OpusのRTPペイロードタイプ |
| `TURN_HOST` | `CHAT_SYNC_URL` のホスト名 | coturnホスト（`TURN_HOST` で上書き可） |
| `TURN_PORT` | `3478` | coturnポート（`TURN_PORT` で上書き可） |
| `TURN_USERNAME` | `webrtc` | TURN認証ユーザ名（`TURN_USERNAME` で上書き可） |
| `TURN_CREDENTIAL` | `webrtcpass` | TURN認証パスワード（`TURN_CREDENTIAL` で上書き可） |
| `TLS_REJECT_UNAUTHORIZED` | `NODE_ENV === "production"` | sync シグナリング WS の TLS 検証 (dev 時は自己署名証明書を許容) |

`ICE_SERVERS` 構成（sync フロントエンドと同等）:

1. `stun:stun.l.google.com:19302`
2. `stun:${TURN_HOST}:${TURN_PORT}`
3. `turn:${TURN_HOST}:${TURN_PORT}` (UDP) — username/credential 付き
4. `turn:${TURN_HOST}:${TURN_PORT}?transport=tcp` — username/credential 付き

> 実環境では P2P 直結ではなく **TURN リレー**を通る。TURN の実効 MTU は ~1200B のため、
> ffmpeg の RTP は `-pkt_size 1200` で 1200B 以下に分割している(後述)。

### 公開API

#### `startWebRTCSession()`

セッションを開始する。すでに起動済みの場合は何もしない。

1. `startFfmpegPipeline()` — `MediaStreamTrack` (video/audio) を生成し、ffmpeg サブプロセス + UDP ソケットを起動 (送信側)
2. `connectToChatSync()` — chat_sync サーバーへ WebSocket 接続

`receiveEnter.ts` でコマンド `CALL` が入力されたときに呼ばれる。送信元クライアントの選択は `cameraRotator` が担当する (下記参照)。

```
"CALL" コマンド
  → receiveEnter.ts
    → startWebRTCSession()      // ffmpeg/UDP + chat_sync 接続
    → startCameraRotation()     // 送信元を /pi に固定
```

> 受信パイプラインは CALL 時ではなく **peer-joined / peer-ready のたびに起動**する
> (idle 放置すると ffmpeg の内部状態が不安定になり最初の RTP を消化できず frame=0 で
> 固まるため)。

#### `stopWebRTCSession()`

セッションを停止し、全リソース（ffmpeg、UDPソケット、recv recorders、PeerConnection、WebSocket、`videoTrack` / `audioTrack`）を解放する。`STOPWEBRTC` コマンドでは先に `stopCameraRotation()` を呼んで送信元クライアントの MediaRecorder を止めてから本関数が呼ばれる。

#### `feedWebMChunk(chunk, fromId?)`

ブラウザから受け取った WebM チャンクを ffmpeg の stdin へ書き込む。

- `activeSourceClientId === null` のときは破棄 (切替過渡期のチャンク除外)
- `fromId` が指定され、現アクティブ ID と一致しない場合も破棄
- 通過時に `ffmpegProc.stdin.write(chunk)`、`activeChunkCount++`

呼び出し元:
- `socket/wsServer.ts` — `bufferFromClient` メッセージ。送信元 `id` を第二引数で渡す

> **buffer pool 修正**: `wsServer.ts` で `Buffer.from(b64, "base64")` の `.buffer` をそのまま渡すと Node.js の Buffer pool (8KB) を共有してしまい、後続データに上書きされる。`buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)` で実バイト範囲だけ切り出してから渡す必要がある。回帰テストあり。

#### `setActiveSourceClientId(id | null)`

`feedWebMChunk` のチャンク受け入れ対象を更新する。`cameraRotator` が切り替えのたびに呼ぶ。null をセットすると切替過渡期として全チャンクを破棄する。

#### `restartFfmpegSubprocess()` *(async)*

ffmpeg サブプロセスと UDP ソケットだけを作り直す。`videoTrack` / `audioTrack` (werift PeerConnection が保持) は維持されるため、WebRTC セッションを切らずに新しい MediaRecorder セッションの EBML ヘッダから再 probe させられる。

内部構造:
- `ensureTracks()` — 初回のみ `MediaStreamTrack` を生成 (idempotent)
- `startFfmpegSubprocess()` — UDP bind + `spawn("ffmpeg", ...)`
- `stopFfmpegSubprocess()` — SIGTERM 後 `close` イベントを await。ffmpeg の close ハンドラが `ffmpegProc` / `videoUdp` / `audioUdp` を null クリアする

---

### 内部処理フロー

#### 送信方向（ブラウザ → sync ピア）

```
/pi ブラウザ MediaRecorder (vp8,opus WebM)
  │  bufferFromClient (ArrayBuffer chunk)
  ▼
wsServer.ts
  │  feedWebMChunk(chunk, id)   // activeSourceClientId 以外は破棄
  ▼
ffmpegプロセス (stdin)
  │  WebM (VP8+Opus) を demux
  │  video: libvpx で再エンコード(定期キーフレーム注入)
  │  audio: Opus copy
  │  -flush_packets 1 -max_delay 0 で各 output を即送出
  ├─► UDP :5004  VP8 RTP (PT=96)
  │     videoUdp.on("message") → RtpPacket.deSerialize()
  │       → rewriteOutgoingRtp(rtp,"video") → videoTrack.writeRtp()
  └─► UDP :5006  Opus RTP (PT=111)
        audioUdp.on("message") → RtpPacket.deSerialize()
          → rewriteOutgoingRtp(rtp,"audio") → audioTrack.writeRtp()
              │
              ▼
        RTCPeerConnection (werift) → DTLS-SRTP → TURN → sync ピア
```

##### ffmpeg コマンド(現行)

```
ffmpeg
  -fflags +nobuffer -analyzeduration 0 -probesize 32
  -i pipe:0
  # video: VP8 再エンコード(定期キーフレーム、ソースのタイミングに非依存)
  -map 0:v:0 -c:v libvpx -b:v 800k
  -deadline realtime -cpu-used 8
  -r 20 -vsync cfr            # フレームレート確定(probesize 32 だと未検出になるため明示)
  -g 30 -keyint_min 30        # 30フレーム(=約1.5秒)ごとに必ずキーフレーム
  -error-resilient 1
  -payload_type 96 -flush_packets 1 -max_delay 0
  -pkt_size 1200             # ★ RTP を 1200B 以下に分割(TURN の MTU 対策)
  -f rtp rtp://127.0.0.1:5004
  # audio: Opus はそのまま中継
  -map 0:a:0 -c:a copy
  -payload_type 111 -flush_packets 1 -max_delay 0
  -f rtp rtp://127.0.0.1:5006
```

| オプション | 目的 |
|---|---|
| `-fflags +nobuffer -analyzeduration 0 -probesize 32` | 入力 WebM の analyze を最小化し起動を早める |
| `-c:v libvpx -b:v 800k -deadline realtime -cpu-used 8` | VP8 をリアルタイム再エンコード(ソース非依存でキーフレーム生成) |
| `-r 20 -vsync cfr` | フレームレートを 20fps に固定(probesize 32 では未検出になるため明示) |
| `-g 30 -keyint_min 30` | 約1.5秒ごとに必ずキーフレームを出す(遅参ピア・パケットロス復帰) |
| `-pkt_size 1200` | **RTP を 1200B 以下に分割(TURN の MTU 超過対策)** |
| `-c:a copy` | 音声はブラウザの Opus をそのまま転送 |
| `-payload_type 96 / 111` | werift 側で宣言した PT と一致させる |
| `-flush_packets 1 -max_delay 0` | output で packet を貯めずに即送出、muxer jitter を 0 |

- ffmpeg stderr は `error|invalid|fail|unable|could not|no such` を含む行だけ
  `[ffmpeg]` 付きでログ出力。異常 `close` 時に UDP ソケットを閉じる。

##### `rewriteOutgoingRtp(rtp, kind)`

ffmpeg 再起動のたびに RTP の seq / timestamp が新規発番されて不連続になるのを隠すため、
**送出 seq を連番・timestamp を単調増加**に書き直してから `writeRtp` する。これにより
ffmpeg respawn を跨いでもリモートピアの jitter buffer が破綻しない。

#### 受信方向（sync ピア → ブラウザ）

```
sync ピア
  │  WebRTCでRTPパケット送信 (video VP8 / audio Opus)
  ▼
RTCPeerConnection.ontrack
  │  track.kind に応じて
  │   video → recvRecorder.addTrack(track)
  │   audio → recvAudioRecorder.addTrack(track)
  ▼
werift MediaRecorder (numOfTracks=1, 各 kind 別インスタンス)
  │  RTP depacketize → WebM Cluster + SimpleBlock を逐次出力
  ▼
ioState.io.emit("mediaChunkFromServer", ArrayBuffer)   // video
ioState.io.emit("audioChunkFromServer", ArrayBuffer)   // audio
  ▼
ブラウザ msePlayback.ts
  │  appendMediaChunk / appendAudioChunk
  ▼
SourceBuffer.appendBuffer → <video remoteVideo> / <audio remoteAudio>
```

##### なぜ video / audio で recorder を分けるか

werift の `MediaRecorder` は LipSync 無効 + 1 トラック単独構成なら timecode が単調増加で出力されるが、`numOfTracks: 2` で video+audio を 1 つの recorder に通すと、 video block と audio block が独立タイムスタンプで interleave され、結果的に block の timecode 順序が逆転する。MSE はこれを `MEDIA_ERR_DECODE: Got a block with a timecode before the previous block` として拒否する。

このため video / audio で別 recorder + 別 WebM stream を構築し、フロントでは別 MediaSource (`audio/webm; codecs="opus"`, `video/webm; codecs="vp8"`) でそれぞれ `<audio>` / `<video>` に流し込む。

##### werift MediaRecorder 構成

```ts
new WeriftMediaRecorder({
  numOfTracks: 1,
  stream,                // WebmOutput を流す Event
  disableLipSync: true,  // audio/video 同期は不要 (1 トラック)
  disableNtp: true,      // RTCP SR が遅れる/来ない場合に block が flush されないのを回避
});
```

`disableNtp: true` にすると `RtpTimeCallback` が naive な RTP timestamp を ms 換算で使う。これにより RTCP SR を待たずに最初の block から flush される。

##### キーフレーム取得 (PLI)

video の最初の RTP 受信時に **burst** で 5 回 (500ms 間隔) PLI を送り、以降は 2 秒ごとの定期 PLI に切り替えてパケットロス耐性を持たせる。

#### シグナリング（chat_syncとのWebSocket通信）

```
startWebRTCSession()
  └─ connectToChatSync()
       │  ws.on("open") → send({ type: "join", roomId: "chat sync", peerId })
       │
       ├─ "joined"      → ログ出力のみ
       ├─ "peer-joined" → [Offerer側] buildPeerConnection() → createOffer() → send offer
       ├─ "peer-ready"  → [Answerer側] buildPeerConnection() → offer待機
       ├─ "offer"       → setRemoteDescription() → createAnswer() → send answer
       ├─ "answer"      → setRemoteDescription()
       ├─ "ice-candidate" → addIceCandidate()（未接続時はpendingCandidatesへ保存）
       ├─ "peer-left"   → PeerConnection / recv recorders をクローズ
       └─ "room-full"   → ログ出力のみ
```

`pendingCandidates` に溜まったICE候補は `setRemoteDescription` 完了後に `flushCandidates()` でまとめて適用する。

#### 自動再接続

シグナリングWSの `close`/`error` を検知すると `scheduleReconnect()` が指数バックオフで再接続する。

| 項目 | 値 |
|---|---|
| 初回ディレイ | 1000ms |
| 上限 | 30,000ms (`1s → 2s → 4s → 8s → 16s → 30s → 30s …`) |
| 抑止条件 | `stopWebRTCSession()` で `stopRequested = true` になっている場合 |
| 再接続前のクリア | `pc.close()` / `remotePeerId = ""` / `pendingCandidates = []` |
| `myPeerId` | `startWebRTCSession()` で生成、再接続でも維持 |
| 接続成功時 | `reconnectAttempt = 0` にリセット |

`videoTrack` / `audioTrack` は再接続を跨いで継続使用する。ffmpeg + UDP ソケットは送信元切替時に作り直されるが、シグナリング再接続そのものでは ffmpeg は再起動されない。

#### `peer-left` の状態リセット

リモートピアが退室したら以下をクリアし、同一WSセッション内で別ピアが入ってきたとき (`peer-joined` / `peer-ready` 再受信) に新規 PC + 新規 recv recorders を正しく構築できるようにする。

- `pc.close()` → `pc = null`
- `remotePeerId = ""`
- `pendingCandidates = []`
- `recvRecorder.stop()` / `recvAudioRecorder.stop()` → null
- ブラウザへ `mediaResetFromServer` を送り MSE をリセット (新しい init segment を取り直すため)

---

### RTCPeerConnection設定

`buildPeerConnection()` で生成。

| 項目 | 値 |
|---|---|
| ICEサーバー | `ICE_SERVERS`（Google STUN + 自前 STUN + 自前 TURN udp/tcp の 4 件） |
| 映像コーデック | VP8 / clockRate 90000 / PT 96 |
| 映像 rtcpFeedback | `nack` / `nack pli` / `ccm fir` / `goog-remb` |
| 音声コーデック | Opus / clockRate 48000 / channels 2 / PT 111 |
| トランシーバー方向 | `sendrecv`（送受信両方） |

### 診断ログ

| ログ | 意味 |
|---|---|
| `[werift tx] video #N outSeq=.. outTs=.. marker=.. len=.. desc=..` | werift が送出した VP8 RTP(seq/ts 書き直し後、先頭40 + 200毎) |
| `[ffmpeg→werift] video/audio RTP rx=N pt=P seq=S ts=T` | ffmpeg → werift の RTP 受信カウンタ (送信パイプライン) |
| `[werift recorder] kind=initial/cluster/block #N XB head=...` | recv 側 werift recorder が出した WebM チャンク (video) |
| `[werift audio recorder] kind=...` | 同上、audio |
| `[werift sender stats:video/audio] packets=N bytes=B ssrc=...` | 接続後 2 秒ごとに sender の outbound-rtp 統計 |
| `[ffmpeg] ...` | ffmpeg stderr のエラー行のみ |
| `[REMOTE offer/answer] ...` / `[LOCAL offer/answer] ...` | SDP 抜粋(direction / rtpmap / fmtp / rtcp-fb / extmap / transport) |

---

## 4. カメラセレクタ (`webRTC/cameraRotator.ts`)

CALL 中、送信元のブラウザクライアントを **`/pi`(`urlPathName` に "pi" を含む端末)に固定**
する。以前は 20 秒ごとに全クライアントを巡回していたが、現在は巡回せず `/pi` に一度だけ
切り替える。受信パイプライン (werift recv recorder → `mediaChunkFromServer` /
`audioChunkFromServer`) は触らないため、再生側は常に sync ピア 1 台分の映像/音声を継続表示する。

### 定数

| 定数 | 値 | 説明 |
|---|---|---|
| `PI_POLL_INTERVAL_MS` | `2_000` | `/pi` 未接続時に再探索する間隔 |
| `ACTIVATE_DELAY_MS` | `200` | `bufferRecReqFromServer` 送信後、`activeSourceClientId` を更新するまでの待機。新クライアントの MediaRecorder が EBML を流し始めるための猶予 |
| `REC_REQ_RETRY_INTERVAL_MS` | `1_500` | 切替後にチャンクが流れ始めるまで `bufferRecReqFromServer` を再送する間隔 |
| `REC_REQ_RETRY_MAX` | `20` | 上記再送の最大回数 |

### 公開 API

| 関数 | 目的 |
|---|---|
| `startCameraRotation()` | `setOnPeerConnected(null)` でフックを無効化し、`/pi` を探して `switchTo(pi)` → `startRecReqRetry(pi)`。未接続なら 2 秒間隔でポーリングし、見つかり次第一度だけ切替 |
| `stopCameraRotation()` | フック解除、rec-req 再送停止、現アクティブに `bufferRecStopFromServer`、`activeSourceClientId` を null |
| `ensureWebRtcSession()` | `isWebRtcSessionActive()` でなければ `startWebRTCSession()` + `startCameraRotation()` を冪等起動 |

### 切替手順 (`switchTo`)

```
1) 旧 sender に recorderSwitchStopFromServer を送信
     → 旧クライアントの MediaRecorder.stop() (受信側 MSE はそのまま)
2) setActiveSourceClientId(null)
     → 旧 sender の flush 残りチャンクを feedWebMChunk が破棄
3) await restartFfmpegSubprocess()
     → ffmpeg + UDP ソケットを作り直す。videoTrack/audioTrack は維持
4) 新 sender に bufferRecReqFromServer を送信
     → 新クライアントの MediaRecorder が EBML から開始
5) ACTIVATE_DELAY_MS 待ってから setActiveSourceClientId(newId)
     → 新 sender のチャンクが ffmpeg に流れ始める
```

切替後、対象が実際にチャンクを流し始めるまで(`getActiveChunkCount() > 0` になるまで)
`bufferRecReqFromServer` を `REC_REQ_RETRY_INTERVAL_MS` 間隔 × 最大 `REC_REQ_RETRY_MAX` 回
再送する(`startRecReqRetry`)。initialize 完了前に初回指示を取りこぼす競合のリカバリ。

### 並行ガード

`switchTo` 中に再入すると ffmpeg を多重再起動してしまうため、`rotating` フラグで二重実行を抑止する。

### 接続時リフレッシュフックの無効化

以前は新ピア接続時に `refreshCurrentSource()`(= ffmpeg + 送信元 MediaRecorder を再起動して
キーフレームを作り直す)を `setOnPeerConnected` に登録していた。しかし送信元ブラウザの
キーフレーム供給タイミングに依存して壊れた(Windows /pi で再起動後 video が数秒出ない回帰)。
**libvpx 再エンコード + `-g 30`(定期キーフレーム)に変更したことで遅参ピアも約1.5秒で必ず
キーフレームを得られるため、このフックは無効化**(`setOnPeerConnected(null)`)している。
`refreshCurrentSource()` 関数は将来の参照用に残置するが登録しない。

### 受信側との独立性

カメラセレクタは「ローカル → sync ピア」方向だけを制御する。`recvRecorder` /
`recvAudioRecorder` は werift PeerConnection の `ontrack` で起動済みで、sync ピアからの
RTP を継続して WebM に変換し続ける。そのためフロント側の `<video remoteVideo>` /
`<audio remoteAudio>` の再生は切替の影響を受けない。

---

## 5. フロント MSE 再生 (`webRTC/msePlayback.ts`)

video と audio で別々の `MediaSource` / `SourceBuffer` を持つ。`PlaybackCtx` 構造体でロジックを共通化。

### MIME

| kind | MIME |
|---|---|
| video | `video/webm; codecs="vp8"` |
| audio | `audio/webm; codecs="opus"` |

### 公開 API

| 関数 | 目的 |
|---|---|
| `attachMsePlayback(videoEl)` | `<video>` に MediaSource を紐付け |
| `appendMediaChunk(chunk)` | video WebM チャンクを SourceBuffer に投入 |
| `teardownMsePlayback()` | MediaSource を閉じ srcObject クリア |
| `attachMseAudioPlayback(audioEl)` | `<audio>` 用 |
| `appendAudioChunk(chunk)` | audio 用 |
| `teardownMseAudioPlayback()` | audio 用 |

### `SourceBuffer.mode = "sequence"`

werift recorder は cluster timecode 0 から始まるが、appendBuffer のたびにそれが続いていく前提で `"sequence"` に設定。

### autoplay

`<video>` `<audio>` ともに `autoplay` 属性 + 接続時に `el.play()` を呼ぶ。最初の click (= CALL コマンド入力) の後で初期化されるため user gesture 要件はクリア。

### diagnostic

`HTMLMediaElement.error` を `dumpElError()` で読み取り、code と message を出す:

```
[mse:video] sourceBuffer error: code=3 (MEDIA_ERR_DECODE) message="..."
```

---

## 6. HTML 要素 / 表示レイアウト

```html
<div id="wrapper">
  <canvas id="cnvs"></canvas>     <!-- z-index: 2 (UI 描画)         -->
  <canvas id="bckcnvs"></canvas>  <!-- z-index: 0 (背景)            -->
  <video  id="remoteVideo"></video>  <!-- z-index: 1 (リモート映像) -->
  <audio  id="remoteAudio" autoplay></audio>
</div>
```

`main.ts` / `snowleopardMain.ts` で `webRtcState.videoPlayer` / `webRtcState.audioPlayer` にアサインする。

`#remoteVideo` は `public/client.css` で画面中央にアスペクト比維持で最大表示する:

```css
body #remoteVideo {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  object-fit: contain;        /* 縦横比維持、はみ出さず最大化 */
  background: transparent;    /* 未受信時に黒枠を出さない     */
  pointer-events: none;       /* キャンバスのクリック操作を妨げない */
  z-index: 1;                 /* bckcnvs(0) と cnvs(2) の間 */
}
```

> CSS の正本は `packages/frontend/public/client.css`。Vite は `public/` 配下をそのまま `dist` (→ `backend/static`) にコピーするため、こちらを編集する。`src/client.css` はどこからも import されていないオーファン。

---

## 7. sync 側の ontrack 修正 (関連)

werift v0.23 は audio transceiver の SDP に `a=msid` を出力しないため、ブラウザ側 ontrack の `streams[]` が track ごとに別物 (または空) になり、`remote-video.srcObject = streams[0]` ではどちらか片方の track しか乗らない問題がある。

sync の `webrtc.ts` ではこれに対応するため、ontrack で **常に shared `remoteStream` に track を追加** し、それを `<video remote-video>` の srcObject として使う:

```ts
this.pc.ontrack = ({ track }) => {
  this.remoteStream.addTrack(track);
  this.cb.onRemoteStream(this.remoteStream);
};
```

これでブラウザ同士でも werift 相手でも、video / audio 両方の track が同じ MediaStream に集約される。

---

## WebSocketイベント一覧

### サーバー → クライアント（WebRTC関連）

| イベント名 | ペイロード | 説明 |
|---|---|---|
| `mediaChunkFromServer` | `ArrayBuffer` | werift recv recorder が出した **video** WebM チャンク (init / cluster / block) |
| `audioChunkFromServer` | `ArrayBuffer` | 同上、**audio** WebM チャンク |
| `mediaResetFromServer` | なし | recv pipeline 再起動。フロントは MSE を作り直す (init segment を取り直すため) |
| `bufferRecReqFromServer` | なし | クライアントへ MediaRecorder 開始を要求。`cameraRotator` が `/pi` 確定時と rec-req リトライで送信する |
| `bufferRecStopFromServer` | なし | クライアントへ MediaRecorder 停止 + MSE 再生リセットを要求。`STOPWEBRTC` で `stopCameraRotation()` から現 sender に送信 |
| `recorderSwitchStopFromServer` | なし | 切替用。MediaRecorder だけ止め、受信側 MSE は壊さない。`switchTo` 内で旧 sender に送信 |
| `candidateReqFromServer` | `string[]` | (シグナリングリレー側) JOIN時に現在のメンバーID一覧 |
| `joinInfoFromServer` | `string` | 同上、新規参加者のID |
| `leaveInfoFromServer` | `string` | 同上、退室者のID |
| `offerRequestFromServer` | なし | 同上、Offer生成要求 |
| `answerReqFromServer` | なし | 同上、Answer生成要求 |
| `iceCandidateFromServer` | `RTCIceCandidateInit` | 同上、ICE候補転送 |
| `offerFromServer` | `{ offer, sourceId }` | 同上、Offer転送 |
| `answerFromServer` | `RTCSessionDescription` | 同上、Answer転送 |

### クライアント → サーバー（WebRTC関連）

| イベント名 | ペイロード | 説明 |
|---|---|---|
| `bufferFromClient` | `ArrayBuffer` | ブラウザ MediaRecorder が出力した WebM チャンク。backend ffmpeg に流し込んで RTP 化し sync ピアへ送る。`wsServer.ts` で送信元 `id` 付きで `feedWebMChunk` に渡され、現アクティブ sender 以外は破棄される |

---

## 解決済み不具合(背景)

1. **送信映像が全く出ない(framesReceived=0)= RTP の MTU 超過**
   ffmpeg 既定の ~1460B RTP が TURN リレー(実効 MTU ~1200)で破棄され、キーフレームを
   構成するパケットが届かず復号できなかった。`-pkt_size 1200` で解決。
   (`?pkt_size=` の URL クエリ形式は本番 ffmpeg がサイレント死したため、出力オプション
   形式 `-pkt_size 1200` を使用。stderr エラーログも追加してサイレント死を検知可能にした。)
   Mac/Windows 両方で双方向表示を確認済み。
2. **キーフレーム供給がソース依存だった**
   当初 `-c:v copy` は入力 VP8 のキーフレームを待つため、送信元ブラウザのキーフレーム
   タイミング次第で黒画面・回帰が起きた(特に Windows /pi)。`libvpx` 再エンコード +
   `-g 30 -keyint_min 30` でソース非依存の定期キーフレーム生成にして解決。

---

## 既知の脆さ / 未解決事象

**chat_sync 単独動作(サーバ再起動直後)では安定して映像が出るが、他の動作を並行させると
黒画面のまま** になる事象が報告されている(2026-05-31 調査中)。構造上の要因候補:

- **共有 `MediaRecorder` / 共有ストリーム**
  `/pi` はインスタレーション用と chat_sync 送信用で `MediaRecorder` と
  `streamState.stream` を共有(`recording/index.ts`)。`stopChunkedRecording()` を呼ぶ
  経路が複数あり、文脈を確認せず止めると chat_sync 送信も止まる。
- **グローバル可変状態の競合**
  `activeSourceClientId` / `ffmpegProc` はモジュールグローバル。`switchTo()` の非同期区間
  (`null` 設定 → 200ms 待ち → 再設定)に届いた `/pi` チャンクは破棄される。並行操作が
  この区間と重なるとチャンク欠落が起きうる。
- **イベントループ / CPU の競合**
  `libvpx` realtime 再エンコードは CPU 負荷が高い。同一 Node プロセスで faceDetectScenario
  (`await` で大量の stream emit / DB アクセス)等が走ると、`bufferFromClient` 処理や
  ffmpeg stdin 書き込みが遅延し RTP 出力が滞りうる。
- **BLACK / ナイトモードは映像を黒くしない(誤解しやすい点)**
  `blackFromServer` → フロントの `enableBlackMode()` は最前面に黒い DOM オーバーレイ
  (`blackMode.ts`、z-index 999999)を被せるだけ。`getUserMedia` / `captureStream` の中身は
  変わらず MediaRecorder も止まらないため、キャプチャ映像自体は黒くならない。
  `masterMuteFromServer` は音声のみ。→ これらは chat_sync 黒画面の直接原因ではない。
- **faceDetectScenario の対象選択**
  `pickClientId()`(`scenario/faceDetectScenario.ts`)は全接続端末からランダム選択し
  `/pi` を除外しない。`/pi` で顔検知すると `recordEmit(detectedClientId)` で `/pi` 宛に
  `recordReqFromServer` が飛ぶ(これ自体は audio worklet フラグ操作で MediaRecorder は
  止めないが、送信元端末に追加処理が乗る)。

### その他の積み残し

- **切替時の途絶**: `switchTo` では ffmpeg を kill → respawn し、新 MediaRecorder が EBML を
  流すまで待つため ~300〜500ms の映像/音声欠落が発生しうる(現在は `/pi` 固定なので
  通常運用では切替自体が起きにくい)。
- **後発接続クライアント**: WebSocket で配信される WebM チャンクは EBML init segment を
  最初に流すため、CALL の途中から接続したクライアントは init を取りこぼし MSE で再生
  できない。backend で init segment をキャッシュして join 時に再送する仕組みが必要。
- **werift SDP の msid 欠落**: sync 側 ontrack 修正で回避済み。
- **recv recorder の 1 トラック制限**: video と audio を 1 つの WebM stream にまとめると
  MSE が拒否するため 2 stream に分けている。lip-sync はブラウザ側 `<video>` `<audio>` の
  単純併走依存で、厳密な PTS 同期はしていない。
