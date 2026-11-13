# コードレビュー結果

- 基準コミット: `dev` @ `3910efb`
- レビュー日: 2026-11-13
- 対象: リポジトリ全体（主要モジュール）
- 方法: 静的レビュー + ビルド / テスト実行
- 未確認: 実機ブラウザ、Redis / Mongo 実接続、M5Stack / Raspberry Pi、WebRTC 実接続

## 1. 結論

直近の3コミットで、大きな機能不整合は解消されています。

- `e2fa019` CINEMA 機能を削除
- `45a8328` AudioWorklet のバッファサイズを 8192 frames に統一
- `3910efb` `GET LIVESTREAM` の音声抽出を完了まで待つよう修正

ビルドと全テストは成功しています。一方で、**再起動時のクライアント依存 state 残留**、**60秒超 UPLOAD のデータ欠落**、**環境変数・依存宣言**、**WebSocket 入力の堅牢性**は未対応です。これらは運用開始後に再現しやすいため、優先して確認することを推奨します。

## 2. 確認結果

| 項目 | 結果 |
|---|---|
| `pnpm -F backend build` | 成功 |
| backend テスト | 65 files / 300 tests 成功 |
| `pnpm -F frontend exec tsc --noEmit` | 成功 |
| frontend テスト | 10 files / 57 tests 成功 |
| `pnpm -F frontend build` | 成功（preload chunk 約893KB） |
| `git diff --check` | 問題なし |

## 3. 解消済み

### 3.1 CINEMA 機能の削除（`e2fa019`）

以下を削除済みです。

- backend: `src/hls/`、`/hls` 静的配信、CINEMA コマンド、`cinemaEmit`、状態・型
- frontend: `src/hls/cinemaPlayer.ts`、`cinemaFromServer` ハンドラ、HTML / CSS
- 依存: `hls.js`
- ドキュメント / テスト: `document/cinema.md`、`test/hls/cinemaAudio.test.ts`

`hls.js` 削除により frontend の preload chunk は約1.29MBから約893KBへ減少しています。

### 3.2 音声チャンクの不整合（`45a8328`）

- `chat-processor.ts` のバッファを 2048 frames から **8192 frames** へ変更
- `workletBufferFromClient.ts` の CHAT `bufferSize` を **byteLength から frames 数**へ修正
- CHAT / TIMELAPSE は毎バッファ送信するよう修正
- それ以外は旧来の送信間隔（8192 frames × 2 ≒ 371ms）を維持
- `workletBufferFromClient` の CHAT `bufferSize` 変換に回帰テストを追加

これにより、受信側が 8192 frames の音声を 32768 frames として扱い、後半に無音を詰める問題は解消されています。

### 3.3 `GET LIVESTREAM` の音声抽出（`3910efb`）

- `packages/backend/src/stream/getPcmBuffers.ts` を追加
- `pcm.getPcmData` の `endCallback` まで待ってからバッファを返すよう修正
- PCM を **44100Hz モノラル**で抽出し、`sampleRateState.sampleRate` も 44100 に固定
- `sampleRateState.randomrate` を false にし、意図しない速度・音程変化を防止
- 末尾の端数は 0 埋めして `bufferSize` を揃える
- 音声抽出に失敗した場合はログを出し、映像のみ登録するフォールバックを追加
- `collectPcmBuffers` の回帰テストを追加

`getLiveStream` は音声バッファが揃うまで `pushBatch` しないため、映像だけが登録されて無音になる問題は解消されています。44100Hz モノラルで抽出し、再生側のサンプルレートも明示的に揃えたため、速度・音程も一致します。

## 4. 優先度: 高

### 4.1 再起動後にクライアント依存 state が残留する

対象:

- `packages/backend/src/state/states/currentState.ts`
- `packages/backend/src/state/states/streamState.ts`
- `packages/backend/src/state/states/cmdState.ts`
- `packages/backend/src/redis/stateRedis.ts:65-98`
- `packages/backend/src/app.ts:345-356`

`currentState` / `streamState` / `cmdState` は Redis に永続化されますが、以下には接続ごとの UUID が入ります。

- `streamState.target`
- `streamState.loop`
- `cmdState.VOICE`
- `currentState.cmd` / `currentState.sinewave`

再起動後はこれらの ID がすべて無効になります。`streamState.target` に古い ID が残ると、`pickupStreamTarget` が切断済み ID を選び、`currentState.stream` が true のまま再生が止まります。`currentState.stream.CHAT` が true で復元されると、最初の CHAT が「開始」ではなく「停止」になります。

`initStreams()` は `streams:keys` と recordIndex の初期化だけを行い、`initRedis()` はどこからも呼ばれていません。動的に追加されたストリーム名も `streamList` に復元されません。

推奨:

- 起動時に `target` / `loop` / `VOICE` / `currentState.cmd` / `sinewave` / `RECORD` / `WHOLE` を初期化する
- もしくはクライアント依存フィールドを永続化対象から外す
- 動的ストリームを `streams:keys` から `streamList` へ復元する

### 4.2 60秒超の `UPLOAD` でデータが欠落する

対象:

- `packages/backend/src/stream/uploadModule/uploadVideo.ts:19-54`
- `packages/backend/src/stream/uploadModule/durationPattern.ts:40-50`
- `packages/backend/src/stream/uploadModule/durationPattern.ts:33`

`durationArr.forEach(async ...)` を await せず、各反復で `streamsRedis.clear(fName)` しています。セグメント同士が競合し、最後の1セグメント以外が消えます。

また `durationPattern` は60秒超で先頭セグメントを `shift()` し、`floor(duration / 20) - 1` 個しか生成しないため、末尾が切り捨てられます。33行目は `===` になっており、`ss` の既定値代入が機能していません。

推奨:

- `for...of` + `await` に変更
- `clear` は全セグメント生成前に1回だけ実行
- 末尾の `duration % 20` セグメントも含める
- 33行目を `lengthArr[0].ss = "0:00:00"` に修正

### 4.3 `.env` の `REDIS_URL` が反映されない / 依存宣言の不足

対象:

- `packages/backend/src/app.ts:10-14`
- `packages/backend/src/redis/client.ts:3`
- `packages/backend/package.json`

`dotenv.config()` は import 評価後に実行されます。CommonJS に変換された `dist/app.js` でも `require("./socket/wsServer")` などが先に走り、`redis/client.ts` は import 時に `process.env.REDIS_URL` を読みます。そのため **`.env` の `REDIS_URL` は無視され、シェルで export した場合だけ有効**です。

また:

- `dotenv` は backend の `devDependencies` ですが、`app.ts` が実行時に使います
- `express` は backend の依存に含まれず、root の依存で偶然解決されています

推奨:

- `.env` を読み込む bootstrap を最初に実行する、または Redis 接続を遅延初期化する
- `dotenv` を `dependencies` へ移動
- `express` / `@types/express` を backend に宣言

### 4.4 `execStream` の target 指定が無視される

対象:

- `packages/backend/src/stream/execStream.ts:18-31`
- `packages/backend/src/stream/execStreamPreparation.ts`
- `packages/backend/src/scenario/faceDetectScenario.ts`

`execStream` の `target?: string` は宣言だけで未使用です。`faceDetectScenario` は検出端末に固定したつもりで `execStreamPreparation(..., detectedClientId)` を呼びますが、実際には全ストリームクライアントからランダムに選ばれます。

推奨:

- `execStream` で `target` が指定されたらその ID を優先する
- または `streamState.target[source] = [detectedClientId]` を明示的に設定する

### 4.5 切断時のクリーンアップと重複登録

対象:

- `packages/backend/src/socket/wsServer.ts:217-235`
- `packages/backend/src/clientSetting/connectFromClient.ts:74-75`
- `packages/backend/src/clientSetting/connectFromClient.ts:174-180`
- `packages/frontend/src/canvasEvent/canvasSizing.ts:21-27`

`ws.on("close")` は `client` / `streamClient` / `cmdClient` / `bpmState` しか削除しません。`paCmdClient` / `paStreamClient` / `sinewaveClient` / `arduinoClient`、`streamState.target` / `loop` に ID が残ります。

また、配列に対して

```ts
Object.keys(clientState.cmdClient).includes(sockId)
```

を使っているため、重複チェックがほぼ機能しません。`/1` `/2` `/3` 分岐には重複チェック自体がありません。`canvasSizing` は resize のたびに `connectFromClient` を送るため、リサイズで重複登録が増えます。

推奨:

- `cmdClient.includes(sockId)` / `streamClient.includes(sockId)` を使う
- `/1` 分岐にも重複チェックを入れる
- close 時に全クライアント配列・target・loop から削除する
- `canvasSizing` の送信を debounce する

### 4.6 WebSocket 入力の検証と例外処理

対象:

- `packages/backend/src/socket/wsServer.ts:68-215`
- `packages/backend/src/cmd/execEnter.ts:106-109`

`ws.on("message", async ...)` 全体に try/catch がありません。たとえば未初期化クライアントが `SELF` を送ると、`clientState.client[id]` が undefined のため TypeError になり、未処理 rejection になります。

また、`chatFromClient` / `streamReqFromClient` / `connectFromClient` などは `data` の形を検証していません。`maxPayload` の設定もなく、`workletBufferFromClient` は任意の `source` 名で新しいストリームを作れます。

推奨:

- メッセージハンドラ全体を try/catch で囲む
- 受信データの必須フィールドと型を検証する
- `WebSocket.Server` に `maxPayload` を設定する
- `source` をサーバ側で許可した値に限定する
- `SELF` などクライアント状態を参照するコマンドにガードを入れる

## 5. 優先度: 中

### 5.1 コマンド処理の不具合

- **FADE が常に ON**: `packages/backend/src/cmd/splitSpace/fadeCmd.ts:22` が `targetIdArr.includes[id]` になっています。`.includes(id)` に修正。
- **SELF の QUANTIZE が全端末に効く**: `packages/backend/src/stream/quantize/quantizeCmd.ts:25-45` は `bpmStreamState` を作るだけで使わず、`quantize({ splited: false })` で全クライアントを更新します。
- **PREVIOUS が戻らない**: `stopStream.ts:10`、`solo.ts:14-16`、`execSinewave.ts:32` が `previousState` に `currentState` の参照を代入してから current を書き換えるため、直前状態が消えます。
- **数値指定コマンドの読み上げが空**: `splitSpace/index.ts:84,100` で `stringArr.splice(1)` した後に `stringArr.slice(1)` を読むため、読み上げ文字列が空になります。
- **`1-3` の範囲指定が動かない**: 条件では `-` を許容していますが、実際の展開は `split(",")` のみです。

### 5.2 STOP 後も LOOP が鳴り続ける

対象:

- `packages/backend/src/cmd/execStop.ts:70-80`
- `packages/frontend/src/stream/loop/loopPlay.ts`

`execStop` は `streamState.loop` を消さず、`loopPlay` も `streamFlagState` を見ていません。STOP 後もループ再生が継続します。

### 5.3 録画リクエストのタイマー競合

対象:

- `packages/backend/src/stream/recordEmit.ts:45-47`
- `packages/frontend/src/stream/socketFromServer/recordReqFromServer.ts:17-30`

10秒後に `RECORD = false` にするタイマーが、後から始まった録画を途中で停止します。顔検出の連続実行で発生しやすいです。録画ごとにトークンを持たせ、最新の録画だけがフラグを落とすようにしてください。

`recordAsOtherEmit` はタイムアウトで `RECORD` を戻さないため、一度呼ぶと true のまま残ります。

### 5.4 `sensorState.isMobile` が常に false

対象:

- `packages/frontend/src/main.ts:41`
- `packages/frontend/src/initialize.ts:131,134`
- `packages/frontend/src/state/sensorState.ts`

`main.ts` は `flagState.isMobile` だけを設定し、`initialize` は `sensorState.isMobile` を見ています。モバイルの加速度・GPS 処理が開始されません。

### 5.5 その他

- `wholeEmit.ts:17` の先頭 duration だけ `* 1000` が抜けており、秒とミリ秒が混在しています。
- `m5Access.ts` の `RELAY_HOST` は `m5SetIpAddress` で共有されるため、rotation / vibration の切替先が混ざる可能性があります。
- `arduinoAccess.ts:7` の `requestHost` は import 時に確定するため、後から `arduinoState.host` を更新しても反映されません。
- `glitchStream.ts:15` は `base64,` を含まない video 文字列で `Buffer.from(undefined)` になります。
- `socket.ts:197-215` の `mediaRecReqFromServer` は `streamState.stream` の未初期化を考慮していません。
- `stopCmd.ts:11` は初期化前の `STOP` で `audioContext.currentTime` を参照し、例外になります。
- `initialize.ts:43-45` は `mediaDevices` の存在確認前に `getSupportedConstraints()` を呼びます。`/pi` では `mics[2]` が存在しない場合に落ちます。
- `getScheduleFile.ts` はログディレクトリが空だと `[0]` 参照で落ちます。

## 6. セキュリティ・運用

公開範囲が LAN 外に及ぶ場合は、以下を優先的に確認してください。

- HTTP API / WebSocket に認証がなく、CORS は `*`、WS の Origin 検証もありません。誰でも全操作・録画取得・`/api/voice` の TTS 起動が可能です。
- `docker/docker-compose.yml:8` の Redis は `6379:6379` で全インターフェースに公開され、認証もありません。`127.0.0.1:6379:6379` へ変更するか、認証を追加してください。
- `docker/nginx/certs/private_nopass.key` がリポジトリにコミットされています。自己署名証明書とはいえ、秘密鍵は配備時に生成する運用にすべきです。
- `packages/frontend/src/webRTC/syncConfig.ts:56-57` に TURN の固定資格情報が入っています。公開 TURN サーバーでは悪用リスクがあります。
- `/api/voice` は認証なしで `say` を起動します。テキスト長とキャッシュ上限はありますが、レート制限はありません。
- `docker/redis/snapshot_and_flush.sh` は毎日 `FLUSHALL` しますが、Mongo への退避処理は現状無効です。夜間にバッファと状態が失われる設計になっています。
- プロセス終了時の state flush、Redis / HTTP の graceful shutdown がありません。

## 7. 性能・保守性

- `console.log` が backend 465個、frontend 119個あります。`execStream` / `streamPlay` / `wsServer` / `chatWorklet` のホットパスで毎チャンク出力しています。
- `streamsRedis.getPositionsByRecordIndex` / `getRecordIndexEntries` は毎回 `LRANGE 0 -1` で全エントリを読み、base64 音声を含む JSON を全件パースします。
- `toBase64()` は送信のたびに canvas を新規作成しています。
- `initVideoStream()` はオフスクリーン canvas に 60fps で描画していますが、描画結果を利用していません。
- `chats` キューに上限がなく、Redis の `maxmemory` 設定もありません。
- `types/package.json` の `"types": "src/index.d.ts"` は実ファイルと不一致です。`types/bpmType.d.ts:1` も存在しないパスを参照しています。
- `strict: false` / `skipLibCheck: true` のため、型の不整合がビルドで検出されにくくなっています。
- `packages/backend/static/assets` には過去ビルドの `preload-helper-*.js` が多数残っています。現在の `main.js` からは参照されませんが、旧 CINEMA コードを含む生成物が残っています。

## 8. テスト / CI

- テストは純粋関数・state 依存関数が中心で、WebSocket ハンドラ、`execStream`、CINEMA の DOM、UPLOAD の ffmpeg パイプライン、環境変数 bootstrap の統合テストはありません。
- `document/backend_test.md` / `document/frontend_test.md` のテスト規模は現状と一致していません（実測: backend 65 files / 300 tests、frontend 10 files / 57 tests）。
- CI は Dependabot のみで、テスト・ビルドを実行する workflow がありません。
- 今回の CINEMA 回帰のような問題は、DOM ID の存在チェックや最小のスモークテストでも検出できます。

## 9. 推奨する修正順

1. 起動時のクライアント依存 state 初期化
2. 60秒超 `UPLOAD` の修正
3. `.env` bootstrap と backend 依存宣言の修正
4. 切断クリーンアップ・重複登録・WebSocket 入力検証
5. `execStream` の target 指定
6. STOP / LOOP、録画タイマー、FADE / QUANTIZE / PREVIOUS
7. セキュリティ（認証・公開範囲・Redis bind・秘密鍵）
8. ログ整理、LRANGE 最適化、CI 追加

## 10. 補足

- `scenario/scenario.json` と `log/20261012122223.json` には `CINEMA` 文字列が残っています。git 管理外のユーザーデータのため未変更です。CINEMA は未対応コマンドとして無視されます。
- `packages/backend/static` の古い生成物（`assets/preload-helper-*` など）には旧 CINEMA コードが含まれます。現在の `main.js` からは参照されていません。クリーンビルドまたは古い生成物の削除で解消できます。
- 本レポートは `3910efb` 時点のコードを基準にしています。
