# chat_dev

Node.js + WebSocket + Web Audio API で、接続したクライアント（ブラウザ）に音・映像を出す作品向けサーバです。
キーボードから入力したコマンドをサーバが解釈し、対象クライアントにコマンド／音声／映像バッファを配信します。

## リポジトリ構成

pnpm workspace（`packages/*`）です。

| パス | 内容 |
| --- | --- |
| `packages/backend` | HTTPS サーバ + WebSocket（`ws`）+ Redis 永続 state。エントリは `src/app.ts`。 |
| `packages/frontend` | Vite アプリ。ビルド成果物は `packages/backend/static` に出力され、backend が配信する。 |
| `types/` | backend / frontend 共有の `.d.ts`。相対 import（例: backend から `../../../../types`）で参照する。 |
| `crate/`, `packages/frontend/crate/` | wasm-bindgen の Rust クレート（`simulate` / `tuner`）。ビルドは手動（wasm-pack は package script に無い）。生成 glue `packages/frontend/src/wasm/simulate.js` は追跡対象。 |
| `document/` | 設計・検証ドキュメント（`redis.md`, `WebSocket.md`, `WebRTC.md`, `WebRTC-E2E.md`, `faceDetect.md`, `Timer.md`, `snowleopard.md`, `backend_test.md`, `frontend_test.md`）。 |
| `docker/` | Redis / nginx の docker-compose。 |

補足: `packages/arduino` / `packages/snowleopard` はこのリポジトリの root `package.json` から参照されていますが、このチェックアウトには存在しません。

## 動作環境とセットアップ

### 必須
- Node.js
- pnpm（`mise.toml` に `pnpm = "latest"`）
- Redis（`docker compose -f docker/docker-compose.yml up redis` で起動。既定 `redis://localhost:6379`）
- HTTPS 証明書
  - `packages/backend/src/app.ts` はリポジトリの 1 つ上の `keys/chat/private.key` と `keys/chat/selfsigned.crt` を読み込みます（例: リポジトリが `/Users/knd/chat/chat_dev` なら `/Users/knd/chat/keys/chat/`）。パスフレーズは `chat`。
  - 証明書が無いと起動時に例外で落ちます。

### 環境変数
`.env` はリポジトリ直下から読み込まれます（存在時のみ）。

| 変数 | 既定 | 用途 |
| --- | --- | --- |
| `REDIS_URL` | `redis://localhost:6379` | Redis 接続先（state 永続化・streamBuffer）。 |
| `LOCAL_SERVER_PORT` | `8888` | HTTPS / WebSocket の待受ポート。 |
| `SCENARIO` | 未設定 | `"true"` のとき夜間スケジュール（`startNightSchedule`）を有効化。 |
| `DB_HOST` | 未設定 | Postgres 系外部 API（`http://<DB_HOST>:3030/...`）のホスト。 |
| `MONGO_URL` | `mongodb://localhost:27017` | MongoDB 接続先。 |
| `MONGO_DB` | `itsuki` | MongoDB データベース名。 |

frontend は `packages/frontend/.env.example` を参照。`VITE_CHAT_SYNC_URL`（既定 `wss://chat.knd.cloud/ws`）は `/webrtc` 用のシグナリング接続先で、変更には再ビルドが必要です。

### インストール
```bash
pnpm install
```

## 開発・ビルド・テスト

| 目的 | コマンド |
| --- | --- |
| backend 開発（tsx） | `pnpm -F backend dev` |
| backend 開発（watch） | `pnpm -F backend watch` |
| frontend 開発（vite） | `pnpm -F frontend dev` |
| frontend ビルド（配信用） | `pnpm -F frontend build` → `packages/backend/static` に出力 |
| backend ビルド | `pnpm -F backend build`（`tsc` + JSON アセットを dist へコピー） |
| backend 起動（ビルド後） | `pnpm -F backend start` |
| backend テスト | `pnpm -F backend test` |
| frontend テスト | `pnpm -F frontend test` |
| 単一テスト | `pnpm -F backend exec vitest run test/cmd/charProcess.test.ts` |

- lint スクリプトはありません。型チェックは `pnpm -F backend build`（tsc）で行います。
- 実行構成: `pnpm -F frontend build` の成果物を backend が配信します。backend は同じ HTTPS サーバの `/ws` で WebSocket を提供するため、frontend の `main.ts` は同一ホストの `/ws` に接続します。
- 注意: `vite.config.ts` の dev proxy（`/socket.io` → `ws://localhost:8000`）は旧構成の名残で、現行パス `/ws` と一致しません。vite dev server 経由ではそのままでは backend に接続できません。

## クライアントの接続とモード

ブラウザで `https://<host>:8888/`（または任意パス）を開き、クリック / Enter で初期化するとマイク・カメラを取得して接続します。パス名によって挙動が変わります。

| パスに含まれる文字列 | 挙動 |
| --- | --- |
| `pi` | 特定のマイク（`mics[2]`）を使用。 |
| `nosound` | `\` キーの BASS 発音を抑制。 |
| `noStream` / `nostream` | `clientMode: "noStream"` で接続（ストリームを送らない）。 |
| `left` / `right` | マスターをステレオ左右に振る。 |
| `counter` | 入力文字を回転要求（`rotateReqFromClient`）に使い、一定文字数を超えると読み上げ・サイン波を出すカウンターモード。 |
| `counterbalance` | 端末の加速度センサー値を feedbackGain に反映。 |
| `webrtc` | 初期化を自動実行し、`chat_sync` へ直接 WebRTC 接続する送信端末。 |
| `relay` | `/webrtc` 端末から `/ws` 経由で中継された映像・音声を受信する端末。 |

`html/snowleopard.html` は Safari / WebKit 向けのフォールバック（AudioWorklet の代わりに ScriptProcessor、wasm を使わない）です。

## キーボード操作

- 機能コマンドを入力し、Enter で実行します。入力内容は接続クライアントに表示されます。
- `Enter`: コマンド実行。未初期化時はマイク・カメラ取得。
- `ArrowUp` / `ArrowDown`: 入力履歴の参照。
- `ArrowLeft` / `Backspace`: 1 文字削除。`Tab` / `ArrowRight`: 入力を消去。
- `Escape`: 全停止（STOP 相当）。
- `\`: BASS のトグル（`nosound` 以外）。
- `GAIN` + Enter: ゲイン UI の表示切替。
- 入力が空の状態でスペース: タップで BPM を計測（メトロノーム）。
- `BASSS`: 高音プロパティ付きの BASS。

## コマンド一覧

### 発音・再生（Enter で実行）

| コマンド | 概要 |
| --- | --- |
| `CHAT` | クライアント間で音声・映像をランダムな宛先に送受信して再生。 |
| `FEEDBACK` / `FEED` | 端末のマイク入力をその端末から再生（フィードバック）。 |
| `WHITENOISE` / `NOISE` | ホワイトノイズを再生。 |
| `CLICK` | クリック音を再生。 |
| `BASS` | ベース音を再生。 |
| `SIMULATE` / `SIMS` | マイク入力の音程を模したサイン波を再生（wasm で基本周波数を解析）。 |
| `METRONOME` | BPM 同期のメトロノームを再生。 |
| `(数値)` | 指定 Hz のサイン波を再生（`SINEWAVE` は 20〜20000Hz のランダム）。 |
| `SOLFEGGIO` | ソルフェジオ周波数からランダムに再生（現状は綴り不一致で未動作。既知の注意点を参照）。 |
| `UP` / `DOWN` / `SAME`(`KEEP`) | クリック周波数を上げる / 下げる / 維持。 |
| `PREVIOUS` / `PREV` | 直前の再生内容を再実行。 |
| `RECORD` / `REC` | クライアント側で映像・音声を保持（録画要求）。 |
| `PLAYBACK` | 保持した映像・音声を再生。 |
| `TIMELAPSE` | クライアントが定期送信している映像・音声を受信して再生。 |
| `EMPTY` | 空バッファを再生（無音の再生枠）。 |
| `STOP` | 全停止（`Escape` も同じ）。 |

### パラメータ

| コマンド | 概要 |
| --- | --- |
| `PORTAMENT` / `PORT` | サイン波周波数変化を滑らかに（秒指定／単体で 0⇔5 切替）。 |
| `SAMPLERATE` / `RATE` | サンプリングレート変更（約 4000〜132300Hz）。 |
| `GLITCH` | カメラ画像のグリッチ（音声はリバーブ）。 |
| `GRID` | BPM グリッド再生。 |
| `VOICE` | その端末の読み上げモードをトグル／ON/OFF。 |
| `RANDOM` | PLAYBACK / UPLOAD の再生順をランダム化。 |
| `TWICE` / `HALF` | 現在のサイン波周波数を 2 倍 / 1/2。 |
| `FUSEJI` / `EMOJI` | emoji 表示フラグをトグル。 |
| `FILTER` | 全ストリームの filter フラグをトグル。 |
| `QUANTIZE` | クオンタイズを実行。 |

### 端末・状態制御

| コマンド | 概要 |
| --- | --- |
| `SELF` | その端末のみで発音する self フラグをトグル。 |
| `NO` / `NUMBER` | 各クライアントの index 番号を表示。 |
| `TORCH` / `BLINK` | 端末の照明を点灯（STEADY）／点滅（BLINK）。 |
| `SWITCH` / `ROTATE` | M5 の vibration / rotation リレーをトグル。 |
| `FLOATING` | フローティング表示をトグル。 |
| `WHOLE` | 全画面コマンド表示をトグル。 |
| `LATENCY` | 対象ストリームに `{cmd:"LATENCY"}` を送信。 |
| `MEDIARECORD` | クライアントに録画要求を送信。 |
| `VOSK` | クライアントに Vosk 呼び出しを送信。 |
| `CHATASYNC` | 接続順に「chat」「(async)」を順次送信。 |
| `START` / `SCENARIO` | シナリオを読み込んで実行。 |

### スペース区切りのサブコマンド

第 1 トークンで分岐します（`splitSpace`）。

| 形式 | 概要 |
| --- | --- |
| `<index> <cmd>` | 指定 index の端末に実行（`n,m` や `n-m` で複数指定可）。 |
| `ALL <cmd>` | 全コマンド対象端末へ実行。 |
| `BPM <数値>` | BPM を変更。 |
| `BEAT <数値\|RANDOM> [stream]` | ビート分割再生。 |
| `BUFFER` / `BUFFERSIZE <数値>` | basisBufferSize を変更。 |
| `CLEAR` / `INIT <BUFFER\|REDIS\|stream\|INDEX>` | Redis のバッファ / index を初期化。 |
| `FADE ...` | フェード制御（`FADE IN/OUT [秒]`, `FADE OFF`, `FADE <cmd>`）。 |
| `GAIN <key> [値]` | ゲイン値の設定・表示。 |
| `GET` / `YOUTUBE ...` | ライブストリーム取得（`GET LIVESTREAM [query]`）。 |
| `HELP [cmd]` | ヘルプ表示。 |
| `INSERT` / `FIND ...` | Postgres 系へのストリーム保存・検索。 |
| `LOG FILE\|PUT\|EXPORT\|IMPORT\|CLEAR` | コマンドログの保存・読込・削除。 |
| `PA ...` | PA ターゲット制御。 |
| `PLAYBACK <index>` | 指定 index から再生。 |
| `QUANTIZE ...` | クオンタイズパラメータ設定。 |
| `RECORD AS <name>` | 別名で録音。 |
| `ROTATE ...` / `SWITCH` | rotation / vibration リレー制御。 |
| `STOP ...` | 部分停止。 |
| `TIMELAPSE FALSE\|OFF` / `TRUE\|ON` / `GET\|FETCH` | timelapse の収集制御。 |
| `UPLOAD ...` | アップロード。 |
| `VOSK [ON\|OFF\|START\|STOP\|<数値>]` | Vosk 制御。 |
| `HH:MM:SS <cmd>` / `MM:SS <cmd>` | 時刻予約実行。 |
| `MODULATION` / `MOD <数値>` | BPM モジュレーション。 |
| `<cmd> SOLO` | 対象をそのコマンドのみに絞る。 |

`+` 区切り（`splitPlus`）で複数コマンドを同時実行できます。

## 通信プロトコル

- WebSocket は socket.io ではなく raw `ws` です（`package.json` の socket.io 依存と vite proxy は旧構成の名残）。
- backend: `src/socket/IoFacade.ts` の `IoFacade`（`emit` / `to(id).emit` 風 API）が `src/socket/wsServer.ts` の `new WebSocket.Server({ path: "/ws" })` をラップします。
- frontend: `src/socket/SocketFacade.ts`。指数バックオフ（1〜30 秒）で自動再接続します。
- 双方向のメッセージ形式は JSON `{ "type": <event>, "data": <payload> }`。`ArrayBuffer` は `{ "__type": "ArrayBuffer", "data": "<base64>" }` に変換して送ります。
- backend → client の主なイベント: `connected`, `cmdFromServer`, `chatFromServer`, `streamFromServer`, `workletBufferFromServer`, `stringsFromServer`, `voiceFromServer`, `clientSettingsFromServer`, `faceDetectBlockFromServer`, `stopFromServer` など。
- client → backend の主なイベント: `connectFromClient`, `charFromClient`, `chatFromClient`, `streamReqFromClient`, `workletBufferFromClient`, `gainFromClient` など。

## 状態の永続化

- `src/state/states/*` の一部は `createPersistedState`（`src/redis/stateRedis.ts`）で生成されます。深い Proxy で監視し、変更を debounce（既定 100ms）して Redis の `state:<name>` に保存します。
- 起動時に `loadAllStates()` で Redis から復元します。
- 永続化される state: `cmdState`（GAIN / FADE / CLICKFREQ など）、`streamState`（bufferSize / filter / grid など）、`currentState`（再生中端末など）、`previousState`、`flagState`、`sampleRateState`、`glitchState`、`arduinoState`、`webState`。
- メモリ常駐（非永続）: `clientState`、`bpmState`、`itsukiState`、`webRtcServerState`、`relayState`、`ioState`。
- connector は `src/redis/client.ts`（ioredis）。streamBuffer / chats / counters は `src/redis/streamsRedis.ts`。

## HTTP エンドポイント

| メソッド | パス | 概要 |
| --- | --- | --- |
| GET | `/` | `static/html/index.html` を返す。 |
| GET | `/vosk` | `static/html/vosk.html` を返す。 |
| GET | `/rotate` | `static/html/rotate.html` を返す。 |
| GET | `/:name` | 任意パスを `index.html` にフォールバック。 |
| POST | `/api/scenario` | `scenarioItsuki` を起動（実行中なら停止して再起動）。 |
| POST | `/api/clear-buffer` | Redis の streamBuffer をクリア（`body.stream` 省略時は `CHAT/EMPTY/KICK/SNARE/HAT` 以外）。 |

静的ファイルは `packages/backend/static` から配信します。CORS は全許可です。

補足: `src/route.ts` は HTTP ルーティングではなく、socket のルーム / ターゲット選択ヘルパーです。

## 自動化・シナリオ

- `src/scenario/`: JSON シナリオ（相対／絶対時刻）をタイマーで `receiveEnter` に流して実行。`scenarioItsuki` は定期実行、`replay` はコマンドログの再生、`faceDetectScenario` は顔検知時の演出。
- `src/schedule/`: `HH:MM(:SS)` 指定やログ JSON からの予約実行。
- `src/nightMode/`: 全端末の顔認識停止・シナリオ停止・timelapse 停止・BLACK・masterGain=0 を一括制御。※現状 HTTP から有効化するルートは無く未配線。
- `src/rotate/`: M5Stack の relay HTTP API（rotation / vibration）制御。
- `src/arduinoAccess/`: Arduino の HTTP API（test / relay / cramp / oneshot）制御。

## WebRTC / 中継

- `/webrtc` 端末は `chat_sync`（`VITE_CHAT_SYNC_URL`、既定 `wss://chat.knd.cloud/ws`）へ直接接続する P2P 通話。
- `/relay` 端末は backend の `src/relay/` を介して、`/webrtc` 送信端末の映像・音声を最大 3 受信端末へ中継します。

## 外部サービスと運用スクリプト

- `src/mongo/`: MongoDB 接続と Redis⇔Mongo の取り込み、yesterday 再生ロード、flush。
- `src/mongoAccess/` / `src/stream/toPostgres/`: `DB_HOST` の外部 API（Postgres 系）への保存・取得。
- `packages/backend/scripts/`（package script 未登録。`pnpm -F backend exec tsx scripts/xxx.ts` で手動実行）
  - `redisToMongo.ts`: Redis streamBuffer（PLAYBACK / TIMELAPSE）→ Mongo。
  - `mongoToRedis.ts`: Mongo → Redis（任意で日付フィルタ）。
  - `redisHalveByRecordIndex_rename.ts`: recordIndex グループの間引き（`--dry-run` 対応）。
  - `copyJsonAssets.mjs`: `build` から呼ばれる JSON アセットコピー。

## テスト

- テストランナーは vitest。対象は `<pkg>/test/**/*.test.ts` のみで、値を返す純粋関数・state 依存の純関数が中心です。外部 I/O やブラウザ API 依存は対象外です。
- backend は `test/setup.ts` で ioredis をモックします（state モジュールを import すると Redis ローダが登録されるため）。
- 方針・対象一覧は `document/backend_test.md` / `document/frontend_test.md` を参照。ローカル関数をテストするため source 側に `export` を追加する方針です。

## 既知の注意点（旧構成の名残・未実装）

- backend は raw `ws` を使用。root の `socket.io-client` 依存と `vite.config.ts` の `/socket.io` proxy は旧構成の名残です。
- `packages/frontend` の `snow` / `snowleopard` script は `webpack` を呼びますが、webpack 設定・依存はありません（`pnpm -F frontend build` を使用）。
- `html/form.html` / `src/form/main.ts` はビルド対象外です。
- `SOLFEGGIO` は `receiveEnter.ts` が `SOLFEGIO`、`execCmd.ts` が `SOLFEGGIO` を判定しており綴りが不一致のため、現状どちらも動作しません。
- `src/clientMode/clockMode.ts` / `src/webSocket/*` は参照されていない旧実装です。
