# コードレビュー結果

- 基準コミット: `dev` @ `863310e`（起動時 state 修正は未コミット）
- レビュー日: 2026-11-14
- 対象: リポジトリ全体（主要モジュール）
- 方法: 静的レビュー + ビルド / テスト実行
- 未確認: 実機ブラウザ、Redis / Mongo 実接続、M5Stack / Raspberry Pi、WebRTC 実接続

## 1. 結論

直近のコミットと未コミットの追加修正で、大きな機能不整合は解消されています。

- `e2fa019` CINEMA 機能を削除
- `45a8328` AudioWorklet のバッファサイズを 8192 frames に統一
- `3910efb` `GET LIVESTREAM` の音声抽出を完了まで待つよう修正
- `edfdb3b` 60秒超 UPLOAD を連続20秒区間の逐次処理へ変更
- `d44c4cf` 切断時のクリーンアップ・重複登録・resize 分離を修正
- `7f2f922` WebSocket 入力の検証・例外処理・source 制限を追加
- `69ef1e9` STOP 時の LOOP 解除を追加
- `0365cc9` 録画リクエストのタイマー競合を修正
- `dea78c7` `execStream` の明示 target を優先するよう修正
- 未コミット: 起動時の再生状態リセットと動的ストリーム復元を修正

ビルドと全テストは成功しています。一方で、**環境変数・依存宣言**は未対応です。運用開始後に再現しやすいため、優先して確認することを推奨します。

## 2. 確認結果

| 項目 | 結果 |
|---|---|
| `pnpm -F backend build` | 成功 |
| backend テスト | 76 files / 343 tests 成功 |
| `pnpm -F frontend exec tsc --noEmit` | 成功 |
| frontend テスト | 17 files / 91 tests 成功 |
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

### 3.4 60秒超の `UPLOAD`（`edfdb3b`）

- `durationPattern` を、全長を連続20秒区間でカバーする実装へ変更
- 60秒超のランダム分割を廃止
- `uploadVideo` を `for...of` + `await` の逐次処理へ変更
- `clear` を各反復で行わず、一時 Redis キーへ積んで最後に `RENAME` で置換
- 音声・映像のどちらかが欠けた場合は無音・空映像で補完
- `-ss` / `-t` を ffmpeg の正しい位置へ移動（従来は出力URLの後ろで無視されていた）
- 画像の一時ディレクトリを区間ごとに分離し、古い JPG の混入を防止
- 65秒の生成動画で、音声・映像とも351チャンク（65秒 × 5.4fps）になることを確認

### 3.5 切断時のクリーンアップと重複登録（`d44c4cf`）

- `removeClientState(id)` を新設し、切断時に全クライアント配列・target・loop・cmd・sinewave・VOICE から ID を除去
- 起動時に `sanitizeClientReferences()` で Redis 復元後の stale ID を除去
- `connectFromClient` を冪等化し、配列の重複チェックと `/1` `/2` `/3` の index 衝突処理を修正
- resize を `resizeFromClient` に分離し、登録処理の再送を廃止
- `pickupStreamTarget` / `pickupPaStreamTarget` / `pickupCmdTarget` で切断済み ID を除外
- 同一 ID の再登録、切断後 cleanup、stale target のテストを追加

### 3.6 WebSocket 入力の検証と例外処理（`7f2f922`）

- `socket/validateMessage.ts` を追加し、受信データの型・必須項目を検証
- `ws.on("message")` の非同期処理全体を catch し、未処理 rejection を防止
- `WebSocket.Server` に `maxPayload: 48MB` を設定
- `connectFromClient` / `chatFromClient` / `streamReqFromClient` / `workletBufferFromClient` などの入力を検証
- `source` を `CHAT` と `streamList` に限定し、任意ストリーム生成を防止
- `SELF` が未登録クライアントで参照されないようガード
- 入力検証の単体テストを追加

### 3.7 STOP 時の LOOP 解除（`69ef1e9`）

- `clearLoop` を追加し、`STOP` / `STOP STREAM` / `STOP <stream>` で `streamState.loop` を解除
- 解除対象端末へ `loopClearFromServer` を送信（`loopToggleFromServer` のトグルを流用しない）
- フロントの `loopClearFromServer` ハンドラで対象を削除
- `stopCmd` でローカルの `streamState.loop` と `loopChunk` も破棄
- `loopPlay` は `streamFlagState` が false の場合に再生しない
- `clearLoop` / `loopPlay` のテストを追加

### 3.8 録画リクエストのタイマー競合（`0365cc9`）

- backend の `recordEmit` に録画世代を追加し、古いタイマーを破棄
- 最新の録画終了時だけ `currentState.RECORD` を false にする
- `recordAsOtherEmit` も開始時にタイマーを設定し、停止時に解除
- frontend の `recordReqFromServer` を source ごとの世代管理に変更
- 連続リクエストで古いタイマーが新しい録画フラグを落とさないことをテスト

### 3.9 `execStream` の target 指定（`dea78c7`）

- `resolveStreamTarget` を追加し、明示 target を最優先にした
- target が切断済みの場合は別端末へフォールバックしない
- `execStreamPreparation` に `forcedTarget` を追加
- targetId が1件なら自動的に強制宛先にする
- `faceDetectScenario` の検出端末再生に固定 target を渡す
- `splitPlaybackWithIndex` も選択した端末を強制宛先にする
- 宛先解決と preparation のテストを追加

### 3.10 起動時の再生状態リセットと動的ストリーム復元（未コミット）

- `resetRuntimeStreamState` で `currentState.stream` / `RECORD` / `WHOLE` を初期化
- `previousState.stream` / `RECORD` も初期化し、PREVIOUS で再起動前の再生を再開しない
- `streams:keys` から動的ストリームを `streamList` へ復元
- 復元時に不足する sampleRate / filter / target / loop / bpmState を初期化
- Redis から復元済みの値は上書きしない
- 起動処理と復元処理のテストを追加

## 4. 優先度: 高

### 4.2 `.env` の `REDIS_URL` が反映されない / 依存宣言の不足

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

## 5. 優先度: 中

### 5.1 コマンド処理の不具合

- **FADE が常に ON**: `packages/backend/src/cmd/splitSpace/fadeCmd.ts:22` が `targetIdArr.includes[id]` になっています。`.includes(id)` に修正。
- **SELF の QUANTIZE が全端末に効く**: `packages/backend/src/stream/quantize/quantizeCmd.ts:25-45` は `bpmStreamState` を作るだけで使わず、`quantize({ splited: false })` で全クライアントを更新します。
- **PREVIOUS が戻らない**: `stopStream.ts:10`、`solo.ts:14-16`、`execSinewave.ts:32` が `previousState` に `currentState` の参照を代入してから current を書き換えるため、直前状態が消えます。
- **数値指定コマンドの読み上げが空**: `splitSpace/index.ts:84,100` で `stringArr.splice(1)` した後に `stringArr.slice(1)` を読むため、読み上げ文字列が空になります。
- **`1-3` の範囲指定が動かない**: 条件では `-` を許容していますが、実際の展開は `split(",")` のみです。

### 5.2 `sensorState.isMobile` が常に false

対象:

- `packages/frontend/src/main.ts:41`
- `packages/frontend/src/initialize.ts:131,134`
- `packages/frontend/src/state/sensorState.ts`

`main.ts` は `flagState.isMobile` だけを設定し、`initialize` は `sensorState.isMobile` を見ています。モバイルの加速度・GPS 処理が開始されません。

### 5.3 その他

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
- `document/backend_test.md` / `document/frontend_test.md` のテスト規模は現状と一致していません（実測: backend 76 files / 343 tests、frontend 17 files / 91 tests）。
- CI は Dependabot のみで、テスト・ビルドを実行する workflow がありません。
- 今回の CINEMA 回帰のような問題は、DOM ID の存在チェックや最小のスモークテストでも検出できます。

## 9. 推奨する修正順

1. `.env` bootstrap と backend 依存宣言の修正
2. FADE / QUANTIZE / PREVIOUS
3. セキュリティ（認証・公開範囲・Redis bind・秘密鍵）
4. ログ整理、LRANGE 最適化、CI 追加

## 10. 補足

- `scenario/scenario.json` と `log/20261012122223.json` には `CINEMA` 文字列が残っています。git 管理外のユーザーデータのため未変更です。CINEMA は未対応コマンドとして無視されます。
- `packages/backend/static` の古い生成物（`assets/preload-helper-*` など）には旧 CINEMA コードが含まれます。現在の `main.js` からは参照されていません。クリーンビルドまたは古い生成物の削除で解消できます。
- 本レポートは `863310e` 時点のコードに、未コミットの起動時 state 修正を加えた状態を基準にしています。
