# Redis 接続・読み書き実装ドキュメント

バックエンド (`packages/backend`) における Redis (ioredis) を用いた永続化・キューイング実装の説明。
ストリーム/チャットのバッファ、各種ステート、簡易カウンタを Redis 上に保持している。

夜間の quiet モード遷移時には PLAYBACK / TIMELAPSE バッファを MongoDB に退避し、翌日の `scenarioItsuki`
で「昨日の同時刻に近い録音」を Redis 上の `YESTERDAY` ストリームに復元する流れも実装されている
(後述「MongoDB との連携」)。

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
│                                                                │
│   ┌──────────────────────────────────────────────────────┐    │
│   │ mongo/                                                │    │
│   │   client.ts          ── lazy MongoClient (singleton)  │    │
│   │   flushStreams.ts    ── enterQuiet 時に PLAYBACK /    │    │
│   │                          TIMELAPSE を Mongo へ退避    │    │
│   │   loadYesterdayPlayback.ts ── runOnce 毎に Mongo から │    │
│   │                          YESTERDAY を Redis に復元    │    │
│   └──────────────────────────────────────────────────────┘    │
│                                                                │
└──────────────┬───────────────────────────────────┬─────────────┘
               │ ioredis (TCP)                     │ mongodb (TCP)
               ▼                                   ▼
       ┌────────────────┐                 ┌────────────────┐
       │  Redis Server  │                 │  Mongo Server  │
       │ REDIS_URL      │                 │ MONGO_URL      │
       │ (localhost:    │                 │ (localhost:    │
       │  6379)         │                 │  27017)        │
       └────────────────┘                 └────────────────┘
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
`YESTERDAY` は scenarioItsuki の `runOnce` 内で `loadYesterdayPlayback` が `initKey` するため、Mongo に
昨日分のデータが存在し条件を満たす録音セッションが見つかった時点で動的に追加される。

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
`buffStateType` (= `{ source, audio: ArrayBuffer, video: string, bufferSize, duration, from?, floating?, filter?, timestamp?, recordIndex? }`) を以下で JSON にする。

```ts
serializeStream(buff):
  audio を base64 化 → JSON.stringify({ source, audio: b64, video, bufferSize, duration, from, floating, filter, timestamp, recordIndex })

deserializeStream(raw):
  JSON.parse → audio を Buffer.from(b64, "base64") して ArrayBuffer を slice で切り出す
```

`Buffer.from(string, "base64")` は Node 内部プールから切り出すため、`.buffer` を露出すると他データの残骸が混ざる。そのため `buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)` で実データ範囲のみを返している (`wsServer.ts` の `deserialize` と同じ理由)。

#### `recordIndex` フィールド
PLAYBACK バッファだけが持つ、`recordEmit` の呼び出し単位を識別するカウンタ。

- `src/stream/recordEmit.ts` がモジュールローカルに `let recordIndex = 0` を保持し、`recordReqFromServer`
  を emit する際に payload へ `index` を載せて送信、emit 直後に `recordIndex++` する (プロセス起動から
  単調増加)。
- フロント (`audioWorkletState.chat.recordIndex.PLAYBACK`) は `recordReqFromServer` 受信時にこの値を
  保持し、録音ウィンドウ (`timeout`) 中に発生する `workletBufferFromClient` チャンクへ常に同じ
  `index` を添付する。
- バックエンドの `workletBufferFromClient` は PLAYBACK 分岐で `index` が来たら `buffStateType.recordIndex`
  として `streamsRedis.push("PLAYBACK", ...)` に渡す。
- 結果として「1 回の `recordEmit` = 1 個の `recordIndex` = それに紐づく PLAYBACK バッファ群」が成立し、
  後段の MongoDB 退避 / `YESTERDAY` 復元で同一録音セッションを切り出すキーとして使う。
- `recordAsOtherEmit` (PLAYBACK 以外) には `recordIndex` を付与しない。

### 主な API

| メソッド | Redis コマンド | 概要 |
|---------|----------------|------|
| `initKey(name)` | `SADD streams:keys`, `SET streams:<name>:index 0` | ストリームを登録、index が無ければ 0 にする |
| `hasKey(name)` | `SISMEMBER streams:keys` | 存在チェック |
| `getAllKeys()` | `SMEMBERS streams:keys` | 全ストリーム名 |
| `push(name, buff)` | `RPUSH streams:<name>:buff` | 末尾追加 (`timestamp` 未設定なら `Date.now()` で補完) |
| `pushBatch(name, buffs)` | `RPUSH ... ...` | 複数末尾追加 (空配列なら no-op、`timestamp` 未設定エントリは `Date.now()` で補完) |
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

## MongoDB との連携 (`src/mongo/`)

夜間 quiet 突入時の Redis → Mongo 退避と、`scenarioItsuki` 起動時の Mongo → Redis 復元を担う。

### 接続 (`src/mongo/client.ts`)

```ts
const url = process.env.MONGO_URL || "mongodb://localhost:27017";
const dbName = process.env.MONGO_DB || "itsuki";
export const mongoClient = new MongoClient(url);
export const getMongoDb = async (): Promise<Db> => { /* lazy connect */ };
```

- `mongodb` パッケージ (^6) を利用。`MongoClient` をモジュールスコープのシングルトンとして保持。
- 初回 `getMongoDb()` 呼び出し時に lazy connect。同じ Promise を使い回すため再接続は発生しない。
- DB 名は環境変数 `MONGO_DB` (既定 `itsuki`)。コレクション名はそのままストリーム名 (`PLAYBACK` / `TIMELAPSE` / ...)。
- Docker 構成は `docker/docker-compose.yml` の `mongo` サービス (image `mongo:7.0`、ホストポート `27017`、
  bind mount `./mongo/mongo_data`) で起動。

### enterQuiet 時の Mongo 退避 (`src/mongo/flushStreams.ts`)

`src/scenario/nightSchedule.ts` の `enterQuiet()` が `flushPlaybackAndTimelapse()` を fire-and-forget で
呼び出す。

`flushStreamToMongo(name)`:
1. `LRANGE streams:<name>:buff 0 -1` で生 JSON を全件取得。
2. 各エントリの `audio` を `Buffer.from(b64, "base64")` に変換し、それ以外の `buffStateType` フィールド
   (`source / video / bufferSize / duration / from / floating / filter / timestamp / recordIndex`) は
   そのままドキュメント化。
3. `db.collection(name).insertMany(docs)` で 1 レコード = 1 バッファとして挿入 (`audio` は BSON Binary)。
4. 成功後に `streamsRedis.clear(name)` で Redis 側のバッファを空にする。

`flushPlaybackAndTimelapse()` は `PLAYBACK` → `TIMELAPSE` の順で実行。片方が失敗してももう片方は実行する
(個別 try/catch)。`enterQuiet` 自体はこの完了を待たず、エラーはログのみ。

### `YESTERDAY` 復元 (`src/mongo/loadYesterdayPlayback.ts`)

`src/scenario/scenarioItsuki.ts` の `runOnce()` が毎回 (50 分間隔のシナリオ実行のたび) 先頭で呼ぶ。

1. `target = Date.now() - 24h`、`yStart = 昨日 00:00`、`tStart = 今日 00:00` を計算 (ローカルタイム)。
2. `db.collection("PLAYBACK").find({ timestamp: { $gte: yStart, $lt: tStart } })` で昨日分を取得。
3. その中から `Math.abs(doc.timestamp - target)` が最小のドキュメントを選び、その `recordIndex` を抽出。
   - 該当が無い / `recordIndex` が未定義の場合はログを出して skip (例外は投げない)。
4. 同じ `recordIndex` を持つ全ドキュメントを timestamp 昇順でソート。
5. `streamsRedis.clear("YESTERDAY")` → `initKey("YESTERDAY")` → 初回のみ `pushStateStream("YESTERDAY")`
   (`streamList` への追加 + 各 state の初期値設定)。
6. `audio` を mongo Binary / Buffer / ArrayBuffer の何形でも ArrayBuffer に正規化したうえで
   `streamsRedis.pushBatch("YESTERDAY", buffs)` で投入。

結果として `runOnce` の冒頭時点で「昨日の同時刻に最も近い 1 セッションぶんの PLAYBACK」が
`streams:YESTERDAY:buff` に展開され、`YESTERDAY` ストリームとして再生対象に使える状態になる。

### 注意点
- Mongo 接続失敗は `getMongoDb()` の Promise reject で各呼び出し元の try/catch に伝搬する。`nightSchedule`
  と `scenarioItsuki` 側はどちらもログのみで処理継続する。
- `recordIndex` を持たない旧 PLAYBACK エントリ (本機能導入前のデータ) は `loadYesterdayPlayback` の
  「closest doc に recordIndex 無し」分岐で skip される。
- `flushStreamToMongo` は `insertMany` を 1 回で行うため、バッファが極端に大きい場合はメモリ・BSON 上限
  (16MB / ドキュメント、合計サイズに注意) に留意。長尺の音声は base64→Buffer なので Redis 側より約 25%
  ほど小さくなる (base64 の 1.33 倍が逆方向に効く)。

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
├── mongo/
│   ├── client.ts                     ── MongoClient シングルトン (lazy connect)
│   ├── flushStreams.ts               ── enterQuiet 時 PLAYBACK / TIMELAPSE を Mongo へ退避
│   └── loadYesterdayPlayback.ts      ── runOnce 毎に Mongo から YESTERDAY を Redis に復元
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
│   ├── recordEmit.ts                 ── recordEmit/recordAsOtherEmit、PLAYBACK の recordIndex 採番
│   ├── streamEmit.ts                 ── 順次/ランダム/timestamp 再生
│   ├── wholeEmit.ts                  ── WHOLE モードのランダム選択
│   ├── clearBuffer.ts                ── バッファクリア
│   ├── getLiveStream.ts              ── 外部 API から取得して pushBatch
│   ├── receiveWholeReq.ts            ── WHOLE 応答を chatsRedis に再投入
│   ├── audioWorklet/
│   │   └── workletBufferFromClient.ts── AudioWorklet 経由の録音をストリームへ (PLAYBACK は recordIndex も保存)
│   ├── uploadModule/
│   │   ├── uploadAudio.ts            ── PCM 化したオーディオを pushBatch
│   │   └── uploadVideo.ts            ── PCM + 画像化した動画チャンクを pushBatch
│   └── toPostgres/postStream.ts      ── streamsRedis から読み出し外部 PostgreSQL に POST
├── scenario/
│   ├── nightSchedule.ts              ── enterQuiet で flushPlaybackAndTimelapse を起動
│   └── scenarioItsuki.ts             ── runOnce 毎に loadYesterdayPlayback → loadScenario → execScenario
├── cmd/splitSpace/
│   ├── index.ts                      ── CLEAR / REDIS CLEAR などの分岐
│   └── splitToPostgres.ts            ── INSERT (stream) (place) (date) を postStream に橋渡し
├── socket/wsServer.ts                ── ensure connection / faceDetectFromClient で Redis 読み書き
└── mongoAccess/                      ── 旧 MongoDB アクセス層 (現状未使用、参考のみ)
    ├── findStream.ts
    └── insertStream.ts
```

`mongoAccess/` の `findStream` / `insertStream` は古い外部 DB アクセス実装で、現行のコマンドルーティング (`splitSpace`) からは呼ばれていない。実体は `splitToPostgres` → `toPostgres/postStream` のみが現役の外部 DB 書き出し経路。
