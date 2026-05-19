# Redis 接続・読み書き実装ドキュメント

バックエンド (`packages/backend`) における Redis (ioredis) を用いた永続化・キューイング実装の説明。
ストリーム/チャットのバッファ、各種ステート、簡易カウンタを Redis 上に保持している。

---

## 全体アーキテクチャ

```
                         backend (Node.js)
┌──────────────────────────────────────────────────────────────┐
│                                                                │
│   src/app.ts                                                   │
│     ├─ loadAllStates()  ── state:* キーを読み込み in-memory に復元 │
│     └─ initStreams()    ── streams:keys に既定ストリームを登録    │
│                                                                │
│   ┌──────────────────────────────────────────────────────┐    │
│   │ state/states/*.ts                                     │    │
│   │   createPersistedState<T>("xxx", default)              │    │
│   │     │  Proxy で in-memory オブジェクトを監視            │    │
│   │     └─ 変更検知 → debounce(100ms) → redis.set state:xxx │    │
│   └──────────────────────────────────────────────────────┘    │
│                                                                │
│   ┌──────────────────────────────────────────────────────┐    │
│   │ redis/streamsRedis.ts                                 │    │
│   │   streamsRedis  ── 名前付きストリームのバッファキュー    │    │
│   │   chatsRedis    ── CHAT 専用キュー (chats list)        │    │
│   │   countersRedis ── 来訪/退去/顔検知などの単純カウンタ    │    │
│   └──────────────────────────────────────────────────────┘    │
│                                                                │
└──────────────┬─────────────────────────────────────────────────┘
               │ ioredis (TCP)
               ▼
       ┌────────────────┐
       │  Redis Server  │  REDIS_URL (default: redis://localhost:6379)
       └────────────────┘
```

---

## 接続

`src/redis/client.ts`

```ts
import Redis from "ioredis";

export const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

redis.on("error", (err) => {
  console.error("Redis connection error:", err);
});
```

- `ioredis` の単一クライアントをモジュールスコープでシングルトンとしてエクスポート。
- 接続先は環境変数 `REDIS_URL` を優先、未設定なら `redis://localhost:6379`。
- エラーは `console.error` でログするのみで、再接続は ioredis のデフォルト挙動に委ねる。
- アプリケーションコードは `import { redis } from "../redis/client"` で同じ接続を共有する。

---

## キー一覧と用途

| 種別 | キー形式 | データ型 | 用途 |
|------|----------|----------|------|
| ステート | `state:<name>` | string (JSON) | アプリケーション状態の永続化 (`currentState`, `streamState`, `cmdState` ほか) |
| ストリームキー集合 | `streams:keys` | set | 現在 Redis 上に存在するストリーム名の管理 |
| ストリームバッファ | `streams:<name>:buff` | list | `buffStateType` の JSON シリアライズを末尾追加 / 先頭取り出し |
| ストリーム再生インデックス | `streams:<name>:index` | string (int) | 順次再生時の参照位置 |
| チャットキュー | `chats` | list | CHAT 用バッファ FIFO |
| カウンタ | `counters:<name>` | string (int) | `visitor` / `leave` / `faceDetect` などのインクリメンタル数値 |

既定で `streams:keys` に登録されるストリーム: `PLAYBACK`, `TIMELAPSE`, `INTERNET`, `EMPTY` (`streamsRedis.initDefaultKeys`)。

---

## 永続化ステート (`state:*`)

`src/redis/stateRedis.ts` で提供する `createPersistedState<T>(key, base, debounceMs=100)` がコア機能。

### しくみ
1. `makeDeepProxy` がオブジェクトをラップし、`set` / `deleteProperty` / 関数呼び出し (push/splice 等) を捕捉する。
2. 変更が起きると `debounce(save, 100ms)` で `redis.set("state:" + key, JSON.stringify(base))` を呼ぶ。
3. ロードは `loaders` 配列に積まれ、`loadAllStates()` を呼ぶと並列に `redis.get("state:" + key)` → `deepMerge` で in-memory に復元する。
   - 配列の場合は `length = 0` してから `push(...saved)`。
   - オブジェクトの場合は再帰的に `deepMerge`（配列はマージせず置換）。
4. アプリ起動 (`src/app.ts`) では `loadAllStates() → initStreams()` の順で呼び出す。

### 永続化対象ステート (`state/states/*.ts`)

`createPersistedState` を使って Redis に同期されるオブジェクト一覧:

| state key | 定義ファイル | 主な内容 |
|-----------|--------------|----------|
| `state:currentState` | `currentState.ts` | RECORD / WHOLE フラグ、cmd 配列、sinewave、stream 別 ON/OFF |
| `state:streamState` | `streamState.ts` | basisBufferSize、random / grid / pa / loop / floating、ターゲット ID、filter |
| `state:cmdState` | `cmdState.ts` | GAIN / FADE / SINEWAVE / VOICE / METRONOME など |
| `state:arduinoState` | `arduinoState.ts` | host / port / connected / relay |
| `state:glitchState` | `glitchState.ts` | glitch ON/OFF、glitchSampleRate |
| `state:flagState` | `flagState.ts` | clockMode / emoji / timer / vosk / scenario |
| `state:previousState` | `previousState.ts` | 直前の text / cmd / sinewave / stream 状態 |
| `state:sampleRateState` | `sampleRateState.ts` | sampleRate, randomrate*, randomraterange |
| `state:webState` | `webState.ts` | flag / type / url (websocket URL) |

`bpmState`, `clientState`, `ioState`, `personDetectState`, `webRtcServerState` は (`state/index.ts` から見ても) `createPersistedState` を経由しておらず in-memory のみで保持される。

### 注意点
- Proxy 経由でないと書き込み検知できないので、`createPersistedState` 戻り値の参照を経由して値を更新する必要がある。
- debounce が 100ms なので、即時 flush したい場面はない。プロセス終了時の flush 処理は実装されていない（debounce 中のタイマーは破棄される）。
- ロード時のマージはディープマージ、配列のみ完全置換。新しいデフォルトキーを追加すると Redis 側の旧データには無いキーは default が残る。

---

## ストリームバッファ (`streamsRedis`)

`src/redis/streamsRedis.ts` の `streamsRedis` オブジェクト。多くのコマンド (UPLOAD / GET LIVESTREAM / RECORD / TIMELAPSE / chat 受信時の PLAYBACK 保存など) が利用する。

### シリアライズ
`buffStateType` (= `{ source, audio: ArrayBuffer, video: string, bufferSize, duration, from?, floating?, filter?, timestamp? }`) を以下で JSON にする。

```ts
serializeStream(buff):
  audio を base64 化 → JSON.stringify({ source, audio: b64, video, bufferSize, duration, from, floating, filter, timestamp })

deserializeStream(raw):
  JSON.parse → audio を Buffer.from(b64, "base64") して ArrayBuffer を slice で切り出す
```

`Buffer.from(string, "base64")` は Node 内部プールから切り出すため、`.buffer` を露出すると他データの残骸が混ざる。そのため `buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)` で実データ範囲のみを返している (`wsServer.ts` の `deserialize` と同じ理由)。

### 主な API

| メソッド | Redis コマンド | 概要 |
|---------|----------------|------|
| `initKey(name)` | `SADD streams:keys`, `SET streams:<name>:index 0` | ストリームを登録、index が無ければ 0 にする |
| `hasKey(name)` | `SISMEMBER streams:keys` | 存在チェック |
| `getAllKeys()` | `SMEMBERS streams:keys` | 全ストリーム名 |
| `push(name, buff)` | `RPUSH streams:<name>:buff` | 末尾追加 |
| `pushBatch(name, buffs)` | `RPUSH ... ...` | 複数末尾追加 (空配列なら no-op) |
| `get(name, index)` | `LINDEX` | 指定位置を取得 |
| `getLength(name)` | `LLEN` | 件数 |
| `shift(name)` | `LPOP` | 先頭取り出し |
| `clear(name)` | `DEL streams:<name>:buff` | バッファ削除 (index は残る) |
| `getRandom(name)` | `LLEN` + `LINDEX` | ランダム位置を取得 |
| `getIndex(name)` | `GET streams:<name>:index` | 再生インデックス (未設定なら 0) |
| `setIndex(name, val)` | `SET` | インデックス上書き |
| `incrementIndex(name)` | `INCR` | インデックス +1 |
| `initDefaultKeys()` | `initKey × 4` | `PLAYBACK / TIMELAPSE / INTERNET / EMPTY` を初期化 |
| `findClosestByTimestamp(name, timestamp)` | `LRANGE 0 -1` | 全件展開して `timestamp` が最も近いエントリと最初の出現位置を返す |

`findClosestByTimestamp` は全リストをメモリ展開するため、エントリ数が大きい場合は注意。
顔検知時の PLAYBACK 巻き戻し (`wsServer.ts` の `faceDetectFromClient`) で利用する。

### 主な書き込み箇所
- `src/stream/chatReceive.ts`: 受信した `buffStateType` を source に応じて `chatsRedis.push` / `streamsRedis.push("PLAYBACK")` / `streamsRedis.push("TIMELAPSE")` / `streamsRedis.push(source)` に振り分ける。
- `src/stream/audioWorklet/workletBufferFromClient.ts`: クライアントの AudioWorklet から届いた音声/映像チャンクを上記同様に振り分け、`incrementIndex` で再生位置を進める。
- `src/stream/uploadModule/uploadAudio.ts` / `uploadVideo.ts`: アップロードされたメディアを PCM/画像化したのち `clear → pushBatch` でストリームを丸ごと差し替える。
- `src/stream/getLiveStream.ts`: 外部 API (`http://127.0.0.1:8088/liveStream` または `streamApiUrl`) から取得した動画チャンクを `pushBatch` で投入する。

### 主な読み出し箇所
- `src/stream/streamEmit.ts` / `paStreamEmit`: クライアントへの送出時に `getIndex / get / incrementIndex` で順次再生、`random` モードなら `getRandom`、`timestamp` 指定時は `findClosestByTimestamp`。終端で `setIndex(source, 0)` してループ。
- `src/stream/wholeEmit.ts`: WHOLE モード時のランダム選択で `getLength / getRandom / get` を使う。
- `src/stream/toPostgres/postStream.ts`: ストリームを外部 PostgreSQL サービス (`DB_HOST:3030/insertStream`) に投入する際に `getLength / get` で順次読み出す。
- `src/stream/clearBuffer.ts`: `CLEAR BUFFER` コマンド時、`CHAT/EMPTY/KICK/SNARE/HAT` 以外を `clear` する。
- `src/cmd/splitSpace/index.ts`: `CLEAR BUFFER` / `CLEAR <stream>` / `CLEAR INDEX` を直接 Redis 操作する。

---

## チャットキュー (`chatsRedis`)

CHAT ソースの `buffStateType` を `chats` キーの list に FIFO で保持する専用 API。

| メソッド | Redis コマンド | 概要 |
|---------|----------------|------|
| `push(buffer)` | `RPUSH chats` | timestamp が未設定なら `Date.now()` で補完してエンキュー |
| `shift()` | `LPOP chats` | 先頭を取り出してデシリアライズ |
| `length()` | `LLEN chats` | 件数 |
| `get(index)` | `LINDEX chats` | 指定位置を覗き見 (デキューはしない) |

シリアライズは `streamsRedis` と同じ形式 (`deserializeChat` は別関数だが内容は同じ base64 → ArrayBuffer 復元)。

利用箇所:
- `chatReceive.ts`: `case "CHAT"` で `chatsRedis.push(buffer)` → `chatEmit()` でターゲットに `chatFromServer` を送出する直前に `chatsRedis.shift()` で取り出す。
- `wholeEmit.ts`: WHOLE モードでチャット長があれば targetArr に CHAT を含め、`get(random index)` で覗き見して送出する。
- `receiveWholeReq.ts`: `wholeReqFromClient` でクライアントから戻ってきたチャンクを `chatsRedis.push` で再投入する。

---

## カウンタ (`countersRedis`)

`src/redis/streamsRedis.ts` の `countersRedis` は `counters:<key>` を `INCR` / `GET` するだけの簡易ユーティリティ。

| 用途 | キー | 書き込み箇所 |
|------|------|--------------|
| 入場検知 | `counters:visitor` | `src/app.ts` `POST /api/persondetect` (direction=left) |
| 退場検知 | `counters:leave` | `src/app.ts` `POST /api/persondetect` (direction=right) |
| 顔検知 | `counters:faceDetect` | `src/socket/wsServer.ts` `case "faceDetectFromClient"` |

読み出し API (`get`) は存在するが現状コードベースから呼ばれていない (ログ用にインクリメント時の戻り値だけを出力)。

---

## 初期化フロー

### アプリ起動時 (`src/app.ts`)
```ts
loadAllStates()
  .then(() => initStreams())   // streamsRedis.initDefaultKeys()
  .catch((err) => console.error("Redis init error:", err));
cmdLogging("START");
```
- `state:*` を全て読み込んで in-memory を上書き。
- `streams:keys` に `PLAYBACK / TIMELAPSE / INTERNET / EMPTY` を登録、それぞれの index が未設定なら 0 を入れる。
- バッファ本体 (`streams:<name>:buff`) や `chats` は **削除されない**。前回プロセスの残骸が残り得る。

### REDIS CLEAR コマンド (`src/redis/initRedis.ts`)
コマンドラインから `REDIS CLEAR` を入力すると `splitSpace` 経由で `initRedis()` を呼ぶ。

1. `streamsRedis.getAllKeys()` で取得した全ストリームに対し `clear(key)` + `setIndex(key, 0)`。
2. `redis.del("chats")` でチャットキューを空にする。
3. `currentState` の RECORD / WHOLE / sinewave / cmd 配列 / stream フラグを初期値に。
4. `streamState.target.*` / `streamState.pa.*` を空に。
5. 現在接続中のクライアントから `cmdClient` / `streamClient` を再構築 (`stream === true` かつ `urlPathName` に "exc" を含まないもの)。
6. 全クライアントの `bpmState` を `bpmStateDefault` で再生成 (METRONOME / MODULATION / TORCH + `CHAT` と `streamList` の全 stream 分)。

ステート系 (`state:*`) のキーには触らないため、永続化された設定値は維持される。

---

## エラーハンドリングと注意事項

- `redis` クライアント自体のエラーは `console.error` 出力のみ。接続が確立する前に `redis.set` などを呼ぶと ioredis はキューイングして接続後に送出する。
- `createPersistedState` の `redis.set` 失敗時は catch でログを出すだけ。リトライ無し。
- 永続化ステートは debounce 100ms。プロセス停止時に保存しきれず損失する可能性あり。
- バイナリ (`ArrayBuffer`) は base64 で文字列化しているためサイズが約 1.33 倍に膨らむ。長尺の動画ストリームを `streamsRedis` に大量に積むとメモリ・帯域ともにコストが高い。
- `findClosestByTimestamp` は `LRANGE 0 -1` で全件取得後 JS 側で線形探索するので、件数依存で O(n) のメモリ・CPU を消費する。
- `initDefaultKeys` および `initKey` はバッファ本体を初期化しない (= 既存データが残る)。完全リセットは `REDIS CLEAR`。
- `chatsRedis.push` は `from` フィールドを保存していない。一方 `streamsRedis.push` は `from / floating / filter / timestamp` まで含めて永続化する。

---

## 関連ファイル

```
packages/backend/src/
├── app.ts                            ── 起動 (loadAllStates → initStreams) と POST /api/persondetect
├── redis/
│   ├── client.ts                     ── ioredis インスタンス
│   ├── stateRedis.ts                 ── createPersistedState / loadAllStates / Proxy + debounce
│   ├── streamsRedis.ts               ── streamsRedis / chatsRedis / countersRedis 定義
│   └── initRedis.ts                  ── REDIS CLEAR ハンドラ
├── state/
│   ├── index.ts                      ── 各 state を再エクスポート
│   └── states/
│       ├── currentState.ts           ── 永続化対象
│       ├── streamState.ts            ── 永続化対象
│       ├── cmdState.ts               ── 永続化対象
│       ├── arduinoState.ts           ── 永続化対象
│       ├── glitchState.ts            ── 永続化対象
│       ├── flagState.ts              ── 永続化対象
│       ├── previousState.ts          ── 永続化対象
│       ├── sampleRateState.ts        ── 永続化対象
│       ├── webState.ts               ── 永続化対象
│       ├── bpmState.ts               ── in-memory のみ
│       ├── clientState.ts            ── in-memory のみ
│       ├── ioState.ts                ── in-memory のみ (IoFacade)
│       ├── personDetectState.ts      ── in-memory のみ
│       └── webRtcServerState.ts      ── in-memory のみ
├── data/
│   ├── index.ts                      ── streamsRedis / chatsRedis / initStreams を再エクスポート
│   └── chunk/streams.ts              ── initStreams = initDefaultKeys のラッパ
├── stream/
│   ├── chatReceive.ts                ── 受信バッファを source に応じて Redis へ振り分け
│   ├── streamEmit.ts                 ── 順次/ランダム/timestamp 再生
│   ├── wholeEmit.ts                  ── WHOLE モードのランダム選択
│   ├── clearBuffer.ts                ── バッファクリア
│   ├── getLiveStream.ts              ── 外部 API から取得して pushBatch
│   ├── receiveWholeReq.ts            ── WHOLE 応答を chatsRedis に再投入
│   ├── audioWorklet/
│   │   └── workletBufferFromClient.ts── AudioWorklet 経由の録音をストリームへ
│   ├── uploadModule/
│   │   ├── uploadAudio.ts            ── PCM 化したオーディオを pushBatch
│   │   └── uploadVideo.ts            ── PCM + 画像化した動画チャンクを pushBatch
│   └── toPostgres/postStream.ts      ── streamsRedis から読み出し外部 PostgreSQL に POST
├── cmd/splitSpace/
│   ├── index.ts                      ── CLEAR / REDIS CLEAR などの分岐
│   └── splitToPostgres.ts            ── INSERT (stream) (place) (date) を postStream に橋渡し
├── socket/wsServer.ts                ── ensure connection / faceDetectFromClient で Redis 読み書き
└── mongoAccess/                      ── 旧 MongoDB アクセス層 (現状未使用、参考のみ)
    ├── findStream.ts
    └── insertStream.ts
```

`mongoAccess/` の `findStream` / `insertStream` は古い外部 DB アクセス実装で、現行のコマンドルーティング (`splitSpace`) からは呼ばれていない。実体は `splitToPostgres` → `toPostgres/postStream` のみが現役の外部 DB 書き出し経路。
