# VIDEOBUFFER / PLAYVIDEOBUFFER 実装ドキュメント

対象端末のカメラ・マイク入力を 10 秒録画し、バックエンド (Redis) に直近 1 本を
保持させる `VIDEOBUFFER` と、保持した録画を対象端末で再生する `PLAYVIDEOBUFFER`
の説明。

---

## 概要

- `VIDEOBUFFER`: コマンド受信端末が `MediaRecorder` で 10 秒録画し、
  WebSocket (`mediaUploadFromClient`) でバックエンドへ送る。バックエンドは
  コンテナごとに直近 1 本を Redis に上書き保存する。
- `PLAYVIDEOBUFFER`: コマンド受信端末が `videoBufferReqFromClient` を送り、
  バックエンドは保持中の録画を `mediaRecFromServer` で返す。受信端末は
  `playRecording` で `#videoBufferCnvs`（`#cnvs` の背面）へ描画し、
  WebAudio で再生する。
- 録画・再生とも対象はコマンドの宛先端末（番号指定が無ければランダムな 1 端末）。

---

## 全体フロー

```
【録画】

制御端末: "VIDEOBUFFER" Enter
  │ charFromClient → charProcess → execCmd.getCmd (cmdList: VIDEOBUFFER)
  ▼
cmdEmit(["対象id"], { cmd: "VIDEOBUFFER" }) ── cmdFromServer ──► 対象端末
                                                                  │ cmdFromServer.ts
                                                                  ▼ videoBuffer()
                                                            recordAll(streamState.stream, 10000)
                                                             └ webm (VP9 + Opus)
                                                               ※WebM 非対応ブラウザのみ ogg
                                                                  │ uploadRecording()
                                                                  ▼ mediaUploadFromClient (blob: ArrayBuffer)
                                                            wsServer → storeVideoBuffer()
                                                                  ▼
                                                            Redis videoBuffer:webm (通常) / videoBuffer:ogg

【再生】

制御端末: "PLAYVIDEOBUFFER" Enter
  ▼ cmdFromServer ──► 対象端末 requestVideoBuffer()
                        │ emit videoBufferReqFromClient
                        ▼
                  wsServer: getVideoBuffer() (webm 優先)
                        │ videoBufferEmit(data, id)
                        ▼ mediaRecFromServer
                  socket.ts → playRecording(data)
                        │ #videoBufferCnvs へフレーム描画 + chatGain へ音声出力
                        ▼ ended / error で #videoBufferCnvs をクリア
```

---

## コマンド

| 入力 | 動作 | 対象 | 実装 |
|---|---|---|---|
| `VIDEOBUFFER` | 対象端末で 10 秒録画し、バックエンドへ保存 | `pickupCmdTarget`（番号指定 or ランダム 1 端末） | `cmd/execCmd.ts` |
| `PLAYVIDEOBUFFER` | 対象端末へ保持録画の再生を要求 | 同上 | `cmd/execCmd.ts` |

- 別名はなし（`data/list/cmdList.ts` の `VIDEOBUFFER` / `PLAYVIDEOBUFFER` のみ）。
- `execCmd` は `{ type: "CMD", cmd, target: targetIdArr }` を返し、`cmdEmit` が
  `cmdFromServer` を宛先へ送る。
- フロントの受信分岐は `cmd/cmdFromServer.ts`。`flag` / `gain` は使わない。

---

## バックエンド

### `packages/backend/src/media/videoBufferStore.ts`

録画データの Redis 保存・取得・削除を担う。

- `videoBufferDataType`: `{ container, mimeType, blob: ArrayBuffer }`
- `serializeVideoBuffer` / `deserializeVideoBuffer`
  - `blob` を base64 化して JSON 化する。
  - 復元時は `Buffer.from(base64)` が Node 内部プールのスライスを返す場合が
    あるため、`byteOffset` / `byteLength` で実データ範囲を切り出して返す
    （`streamsRedis` と同じ理由）。
- `storeVideoBuffer(data)`: `videoBuffer:<container>` に保存（上書き）。
  - `container` は `webm` / `ogg` のみ許可（`VIDEO_BUFFER_CONTAINERS` /
    `isVideoBufferContainer`）。それ以外は throw して保存しない。
  - `blob` が `MAX_VIDEO_BUFFER_BYTES`（32 MiB）を超える場合も throw して保存しない。
- `getVideoBuffer()`: `webm` → `ogg` の順に探し、最初に見つかったものを返す。
  未保存なら `null`。Ogg はブラウザ対応が限られるため WebM を優先する。
- `clearVideoBuffer()`: `videoBuffer:webm` / `videoBuffer:ogg` を削除。

### `packages/backend/src/media/mediaUploadFromClient.ts`

- `async` 化し、受信データを `storeVideoBuffer(data)` で Redis に保存する。
- 旧実装の `mediaRecReqEmit(data, id)`（送信元へ `mediaRecReqFromServer` を
  返し、再録画させる）は廃止した。これにより `mediaUploadFromClient` →
  再録画のループは起きない。
- ファイル保存等の永続化は未実装（TODO）。

### `packages/backend/src/socket/wsServer.ts`

- `mediaUploadFromClient` を `await` で処理する。
- `videoBufferReqFromClient`: `getVideoBuffer()` を呼び、保持があれば
  `videoBufferEmit(videoBuffer, id)` で要求元だけに返す。未保存 (`null`) なら
  `stringEmit("NO VIDEOBUFFER", true, id)` で要求端末に表示する。
- `mediaUploadFromClient` / `videoBufferReqFromClient` の await は try/catch で
  囲み、Redis 障害や破損データの reject を未処理 rejection にしない。

### `packages/backend/src/socket/ioEmit.ts`

- `videoBufferEmit(data, target?)`: `mediaRecFromServer` を送る
  （`target` 未指定なら全端末、指定時は `io.to(target)`）。

### `packages/backend/src/redis/initRedis.ts`

- `INIT REDIS`（`initRedis()`）時に `clearVideoBuffer()` で保持中の録画を削除する。

---

## Redis

| キー | 値 | 説明 |
|---|---|---|
| `videoBuffer:webm` | `{ container, mimeType, blob }`（blob は base64） | 直近の WebM 録画 |
| `videoBuffer:ogg` | 同上 | 直近の Ogg 録画（WebM 非対応ブラウザ時のみ） |

- 保存はコンテナごとに 1 本で、次の `VIDEOBUFFER` で上書きされる。
  端末・時刻の区別はない（誰の録画かは保持しない）。
- 通常は WebM のみ保存される。`videoBuffer:ogg` は WebM を録画できない
  ブラウザのときだけ使われる（フロントは WebM 優先で 1 コンテナのみ録画する）。
- 上限・TTL はなし。base64 のため Redis 上は実データの約 4/3 のサイズになる。
- `INIT REDIS` で削除。Redis 側の永続化設定によってはサーバ再起動後も残る。

---

## フロントエンド

### `packages/frontend/src/mediaRecorder/videoBuffer.ts`

- `VIDEO_BUFFER_DURATION_MS = 10000`。
- `videoBuffer()`
  - `initialize()` が取得済みの `streamState.stream` を再利用し、
    `recordAll(stream, 10000)` で優先コンテナ (WebM → Ogg) を 1 つ録画する。
  - 各 `Recording` を `uploadRecording` で送信する。録画後もトラックは停止しない
    （他機能と共有しているため）。
  - 録画中 (`isRecording`) に再度呼ばれた場合は warn して無視する
    （MediaRecorder を多重起動しない）。
  - `streamState.stream` が `null` なら warn して何もしない。
- `requestVideoBuffer()`
  - `socketState.socket.emit("videoBufferReqFromClient")` を送る。

### `packages/frontend/src/mediaRecorder/recorder.ts` / `upload.ts`（既存）

- `recordAll` は優先順 (WebM → Ogg) で利用可能なコンテナを 1 つだけ録画する
  （VP9 + Opus）。WebM が使える環境では Ogg を録画しない
  （`supportedContainers`）。
- `uploadRecording` は Blob を `ArrayBuffer` に変換して
  `mediaUploadFromClient` を emit する。`SocketFacade` が
  `{ __type: "ArrayBuffer", data: base64 }` に変換して送る。
- 送信前に `socket.isOpen` を確認し、切断中なら変換せず warn してスキップする
  （`SocketFacade.emit` は非 OPEN 時に無言で破棄するため）。

### `packages/frontend/src/socket.ts`（既存）

- `mediaRecFromServer` 受信で `playRecording(data)` を呼ぶ。
- 別経路の `mediaRecReqFromServer`（`REC` / `MEDIARECORD`）は従来どおり
  5 秒録画して送るだけで、`VIDEOBUFFER` とは独立している。

### 描画用 canvas（`#videoBufferCnvs`）

- `html/index.html` / `html/snowleopard.html` に
  `<canvas id="videoBufferCnvs">` を追加（`#cnvs` の直前）。
- `public/client.css` で `#videoBufferCnvs { position: absolute; z-index: 1; }`
  とし、`#cnvs`（z-index 2）より背面、`#bckcnvs`（z-index 0）より前面に置く。
- `canvasEvent/canvasSizing.ts` が起動時 / リサイズ時に `#videoBufferCnvs` の
  サイズもウィンドウに合わせる。
- これにより `#cnvs` に描かれた文字・画像（textPrint 等）は録画映像の前面に残る。

### `packages/frontend/src/mediaRecorder/playRecording.ts`

- 受信 Blob を `<video>` でデコードし、`requestAnimationFrame` で
  `#videoBufferCnvs` 全面へ、アスペクト比を保った contain 配置で描画する。
  毎フレーム `clearRect` してから `drawImage` する。
- 音声は `createMediaElementSource` → `gainState.chatGain` へ接続する
  （`<video>` 要素自体は `muted`）。
- `ended` / `error` の cleanup で RAF 停止・node 切断・ObjectURL 解放に加えて
  `#videoBufferCnvs` を `clearRect` する（`#cnvs` の内容は消さない）。

---

## 検証

- 型チェック:
  - `pnpm -F backend exec tsc --noEmit`
  - `pnpm -F frontend exec tsc --noEmit`
- テスト: `packages/backend/test/media/videoBufferStore.test.ts`（7 ケース）
  - serialize → deserialize のラウンドトリップ / 空 blob
  - `videoBuffer:<container>` への保存
  - webm / ogg 以外の container を拒否 / 上限 (32 MiB) 超過の blob を拒否
  - WebM 優先・Ogg フォールバック・未保存 `null`
  - `clearVideoBuffer` で両キー削除
- 実行:
  - `pnpm -F backend exec vitest run test/media/videoBufferStore.test.ts`
  - `pnpm -F backend exec vitest run` / `pnpm -F frontend exec vitest run`
- 手動確認: `VIDEOBUFFER` → `PLAYVIDEOBUFFER` で再生し、`#cnvs` に
  `textPrint` 等で描いた内容が映像の前面に残ることを確認。

---

## 制約・既知の制限

- 保持はコンテナごとに直近 1 本のみ。端末識別なし（誰の録画かは保持しない）。
- 録画長は 10 秒固定（`VIDEO_BUFFER_DURATION_MS`）。
- `initialize()` 前の端末では `streamState.stream` が無く録画できない。
- `VIDEOBUFFER` は録画完了まで 10 秒かかる。完了前に `PLAYVIDEOBUFFER` しても
  直前の録画（または未保存の `null`）が返る。
- コマンド対象は番号指定が無ければランダム 1 端末（`pickupCmdTarget` の既定）。
- 再生は `#videoBufferCnvs` に行う。`#cnvs` 側の描画（TILE 等）は映像の前面に
  残るが、`#bckcnvs` よりは前面になる。
- 同時に複数の再生が走ると同一 canvas に複数の描画ループが重なる
  （前の再生を止める仕組みはない）。
- 保存できる blob は `MAX_VIDEO_BUFFER_BYTES`（32 MiB）まで。
  それを超える録画は保存されない。

---

## 関連ファイル

| ファイル | 役割 |
|---|---|
| `packages/backend/src/media/videoBufferStore.ts` | Redis 保存・取得・削除、base64 シリアライズ |
| `packages/backend/src/media/mediaUploadFromClient.ts` | 受信録画の Redis 保存 |
| `packages/backend/src/socket/wsServer.ts` | `mediaUploadFromClient` / `videoBufferReqFromClient` のルーティング |
| `packages/backend/src/socket/ioEmit.ts` | `videoBufferEmit`（`mediaRecFromServer`） |
| `packages/backend/src/redis/initRedis.ts` | `INIT REDIS` 時の `clearVideoBuffer` |
| `packages/backend/src/data/list/cmdList.ts` | `VIDEOBUFFER` / `PLAYVIDEOBUFFER` の定義 |
| `packages/backend/src/cmd/execCmd.ts` | コマンド → `{ type: "CMD", cmd, target }` 変換 |
| `packages/backend/test/media/videoBufferStore.test.ts` | videoBufferStore の単体テスト |
| `packages/frontend/src/mediaRecorder/videoBuffer.ts` | 10 秒録画・送信、再生要求 |
| `packages/frontend/src/mediaRecorder/index.ts` | `videoBuffer` / `requestVideoBuffer` の export |
| `packages/frontend/src/cmd/cmdFromServer.ts` | `VIDEOBUFFER` / `PLAYVIDEOBUFFER` の受信分岐 |
| `packages/frontend/src/mediaRecorder/recorder.ts` | `recordAll` / `supportedContainers`（WebM 優先、不可時 Ogg） |
| `packages/frontend/src/mediaRecorder/upload.ts` | `mediaUploadFromClient` への送信（`isOpen` チェック付き） |
| `packages/frontend/src/socket/SocketFacade.ts` | `isOpen`（切断中の送信検知） |
| `packages/frontend/html/index.html` / `snowleopard.html` | `#videoBufferCnvs` の定義 |
| `packages/frontend/public/client.css` | `#videoBufferCnvs` の z-index（`#cnvs` の背面） |
| `packages/frontend/src/canvasEvent/canvasSizing.ts` | `#videoBufferCnvs` のリサイズ |
| `packages/frontend/src/mediaRecorder/playRecording.ts` | 受信録画の `#videoBufferCnvs` 描画・音声再生・クリア |
| `packages/frontend/src/socket.ts` | `mediaRecFromServer` ハンドラ |
