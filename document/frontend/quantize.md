# Frontend Quantize 実装

## 概要

サーバから送られる BPM / クオンタイズ設定を受け取り、対象ストリーム（`CHAT` / `PLAYBACK` / `TIMELAPSE`）の音声・映像バッファを小節単位で再生するフロントエンドの仕組みです。

- バックエンドはクライアント単位で `bpmState[client]`（`bpmClientStateType`）を保持し、`bpmState[client].stream`（`bpmStreamStateType`）に各ストリームのクオンタイズ状態（`beat` / `gridFlag` / `quantizeFlag`）を持ちます。
- 値を変更したタイミングで `bpmFromServer` / `quantizeFromServer` / `quantizeParamFromServer` を emit し、フロントは `quantizeState` に反映して `quantizePlay` で再生します。
- BPM（小節長）は `bpmFromServer`、クオンタイズ ON/OFF は `quantizeFromServer`、`splitBeat`（`BEAT` コマンド）による beat 変更は `quantizeParamFromServer` が担当する分離構成です。

### 関連ファイル

| ファイル | 役割 |
| --- | --- |
| `src/state/quantizeState.ts` | フロントのクオンタイズ状態（`quantizeType`）。 |
| `src/quantize/bpmFromServer.ts` | `bpmFromServer` ハンドラ。小節長（`bar`）を更新し interval を再アーム。 |
| `src/quantize/quantizeFromServer.ts` | `quantizeFromServer` ハンドラ。flag/beat 反映、interval 管理、初回チャンク即再生。 |
| `src/quantize/quantizeParamFromServer.ts` | `quantizeParamFromServer` ハンドラ。対象ストリームの beat のみ反映。 |
| `src/quantize/quantizePlay.ts` | 1 バッファ分の再生と次バッファ要求。 |
| `src/quantize/quantizeStop.ts` | interval 停止と状態リセット（現在 src 未使用）。 |
| `src/util/bpmCalc.ts` | `millisecondsPerBar` などの計算。 |
| `src/socket.ts` | サーバイベントの受信登録と CHAT バッファリング。 |

## 状態

### `quantizeState`（型 `quantizeType`）

`src/state/quantizeState.ts` で定義。

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `bar` | `number` | 1 小節の長さ（ミリ秒）。初期値 `4000`。 |
| `interval` | `number \| null` | 次 tick の `window.setTimeout` ID。 |
| `currentTime` | `number` | 直近 tick の `audioContext.currentTime`（記録用）。 |
| `timeout` | `number` | 未使用。 |
| `intervalFlag` | `boolean` | interval が稼働中かどうか（書き込みのみ・参照なし）。 |
| `stream` | `{ [stream: string]: { flag: boolean; beat: number } }` | ストリーム別のクオンタイズ設定。`CHAT` / `PLAYBACK` / `TIMELAPSE` を保持。 |

- `stream[<name>].flag` … そのストリームのクオンタイズ ON/OFF。
- `stream[<name>].beat` … 1 小節内の分割数。`0` は「ランダム」を意味します。

`quantizeFromServer.ts` にはモジュールスコープの補助状態があります。

- `lastTickAt`（`number`）… 直近 tick の時刻（ms）。BPM 変更時に経過時間を考慮して再アームするために使用。
- `pendingFirstPlay`（`Record<string, boolean>`）… QUANTIZE を ON にした直後の初回チャンクを即再生するためのフラグ（stream 単位）。

### サーバ側 `bpmStreamStateType`（`types/bpmType.d.ts`）

```
{ [stream: string]: { beat: number; gridFlag: boolean; quantizeFlag: boolean } }
```

`bpm` / `latency` は含みません（クライアント単位の `bpmClientStateType.bpm` に集約）。

## サーバからのイベント

### `bpmFromServer` — `{ bpm: number; source: string[] }`

- 送信元: バックエンド `bpm/changeBpm.ts`（`BPM <n>` コマンドから呼ばれる `execChangeBPM`）。
- ハンドラ: `src/socket.ts` → `bpmFromServer(data)`。
- 処理（`src/quantize/bpmFromServer.ts`）:
  1. `source` が配列でなければ何もせず return。
  2. `source` ごとに分岐。
     - `"METRONOME"` … `metronomeState.bar = millisecondsPerBar(bpm)`。
     - `"MODULATION"` … 何もしない。
     - それ以外（ストリーム名） … `quantizeState.bar = millisecondsPerBar(bpm)` とし、変更フラグを立てる。
  3. ストリームの `bar` が変わった場合のみ `refreshQuantizeInterval(true)` を呼ぶ（位相を保った再アーム）。

### `quantizeFromServer` — `bpmStreamStateType`（bare）

- 送信元: バックエンド `socket/ioEmit.ts` の `quantizeEmit`（`splitQuantize` / `quantizeCmd` から呼ばれる）。
- payload はラッパー無しの `bpmStreamStateType` です（`{ bpm, stream }` ではありません）。
- ハンドラ: `src/socket.ts` → `quantizeFromServer(data)`。
- 処理（`src/quantize/quantizeFromServer.ts`）:
  1. 第 2 引数 `bpm` が渡され、`> 0` なら `quantizeState.bar = millisecondsPerBar(bpm)`。**現行の `socket.ts` は第 2 引数を渡さないため未使用**。
  2. `data` の各ストリームについて、`quantizeState.stream` にキーが存在すれば `flag = quantizeFlag`、`beat = beat` を反映。
  3. ON/OFF 遷移を検出して付随処理を行う。
     - OFF → ON … `pendingFirstPlay[stream] = true`（後述の初回即再生用）。
     - ON → OFF … `pendingFirstPlay[stream] = false`、`streamChunk[stream] = {}` に破棄。`CHAT` なら `chatReq(socketState.socketId)` を呼び録音リレーを再開。
  4. `refreshQuantizeInterval()` を呼ぶ。
  5. `quantizeState` を返す（呼び出し側では未使用）。

### `quantizeParamFromServer` — `{ data: bpmStreamStateType; stream: string[] }`

- 送信元: バックエンド `stream/quantize/splitBeat.ts` の `emitSplitBeat`（`BEAT` コマンドから呼ばれる `splitBeat`）。
- payload は `{ data, stream }` のラッパー形式です。`data` が `bpmStreamStateType`（bare）、`stream` が対象ストリーム名の配列です。
- ハンドラ: `src/socket.ts` → `quantizeParamFromServer(data.data, data.stream)`。
- 処理（`src/quantize/quantizeParamFromServer.ts`）:
  1. `quantizeState.stream` の各キーのうち、`streams` に含まれかつ `data[stream]` が存在するものについて `beat = data[stream].beat` を反映。
  2. `flag` は変更しません（ON/OFF は `quantizeFromServer` の担当）。
  3. `textPrint` で `BEAT: <CHAT の beat>` を canvas に表示（`{ timeout: true }` で 500ms 後に自動消去）。
  4. `refreshQuantizeInterval()` は呼びません（`beat` は tick ごとに参照されるため、interval の再生成は不要）。

## 処理フロー

1. `socket.ts` が `bpmFromServer` / `quantizeFromServer` / `quantizeParamFromServer` を受信して各ハンドラを呼ぶ。
2. `quantizeState.bar` と `quantizeState.stream[*].flag/beat` を更新する（`quantizeParamFromServer` は `beat` のみ）。
3. `refreshQuantizeInterval(reset = false)`（`quantizeFromServer.ts`）が interval を管理する。
   - いずれの `stream[*].flag` も `false` … `clearInterval(quantizeState.interval)`、`interval = null`、`intervalFlag = false`。
   - 稼働中かつ `reset === false` … 何もしない（位相を維持）。
   - 未稼働、または `reset === true`（BPM 変更） … 再アームする（後述）。
4. tick（`bar` ms ごと）で各ストリームを判定し、条件を満たせば `quantizePlay(streamChunk[stream], stream[stream].beat)` を呼ぶ。
   - 条件: `streamFlagState[stream]` が真、`streamChunk[stream]` が存在し `audio` がある、`stream[stream].flag` が真。
5. `quantizePlay` が小節内の分割タイミングで発音し、次バッファを要求する。

### interval の再アーム（`scheduleQuantizeTick` / `quantizeTick`）

`setInterval` ではなく、tick のたびに `setTimeout` で次 tick を予約する自己再スケジュール型です。tick 実行時に `lastTickAt = Date.now()` を更新し、次の tick を現在の `quantizeState.bar` 後に予約します。

`refreshQuantizeInterval(reset)` の再アームは次のとおりです。

- **未稼働から開始** … `lastTickAt = Date.now()`、`scheduleQuantizeTick(quantizeState.bar)`。
- **`reset === true`（BPM 変更）で稼働中** … 予約済み tick を `clearInterval` し、`elapsed = Date.now() - lastTickAt` を差し引いた `Math.max(0, quantizeState.bar - elapsed)` で再アーム。位相をリセットしないため、変更が次の小節まで遅れません。

`quantizeState.interval` には `setTimeout` の ID が入ります。ブラウザでは `clearInterval` / `clearTimeout` は同じ ID プールを共有するため、`quantizeStop` の `clearInterval` でも停止できます。

### CHAT のバッファリングと初回即再生

`src/socket.ts` の `chatFromServer` ハンドラで分岐します。

- `quantizeState.stream.CHAT.flag` が真かつ `data.source` が既知のストリーム … `streamChunk[data.source] = streamData` として保持し、interval 側で再生。保持直後に `playPendingQuantizeChunk(data.source)` を呼ぶ。
- それ以外 … `streamPlay` で即時再生。

`streamFromServer`（`CHAT` 以外）も同様にバッファリング時に `playPendingQuantizeChunk(data.source)` を呼びます。

QUANTIZE を ON にした直後は初回 tick が 1 小節後になるため、そのままでは約 1 小節の無音が発生します。これを避けるため `playPendingQuantizeChunk(stream)` は次を行います。

1. `pendingFirstPlay[stream]` が立っていなければ何もしない。
2. `streamChunk[stream]` に `audio` があり、対象の `flag` が真なら即 `quantizePlay`。
3. フラグを下ろし、予約済み tick を破棄して、この再生時刻を起点に `bar` 後へグリッドを張り直す。

これにより ON 直後に届いた最初の 1 件だけが即再生され、以降は通常の量子化グリッドに乗ります。

## `quantizePlay` の詳細（`src/quantize/quantizePlay.ts`）

- `beat` の解決順:
  1. 引数 `beat` が `undefined` でなければそれを使用。
  2. なければ `quantizeState.stream[data.source]?.beat`。
  3. それも無ければ `1`。
   - 解決後の値が `0` の場合、`Math.pow(2, Math.floor(Math.random() * 6))` のランダム値に置き換え。
- `playCount` 回（`0 <= i < playCount`）、`(quantizeState.bar / playCount) * i` ms 後に `setTimeout` で発音。`quantizeState.bar` は呼び出し時点の値を参照します。
- 発音時、`streamFlagState[data.source]` が真のときのみ:
  - `playAudioStream(audio, sampleRate, glitch, bufferSize)`
  - `video` があれば `showImage`（300ms 後に `erasePrint`）、無ければ `textPrint(source.toLowerCase())`
- 再生スケジュール後、次バッファを要求:
  - `source === "CHAT"` … `chatReq(socketState.socketId)`
  - それ以外 … `socket.emit("streamReqFromClient", data.source)`

## 停止（`src/quantize/quantizeStop.ts`）

- `clearInterval(quantizeState.interval)`、`interval = null`、`intervalFlag = false`、全 `stream[*].flag = false` を実行し `quantizeState` を返します。
- 現在 `src` からは呼ばれておらず、`quantize/index.ts` 経由の公開のみです。

## 単位・タイミングの注意

- `bar` はミリ秒です。`millisecondsPerBar(bpm) = 4 * 60000 / bpm`（`src/util/bpmCalc.ts`）。`bpmFromServer` / `quantizeFromServer` ともこの単位に統一されています。
- interval は自己再スケジュール型の `setTimeout` チェーンで、常に最新の `bar` を使用します。BPM 変更時は経過時間を考慮して位相を保ったまま再アームします。
- `quantizeParamFromServer`（beat 変更）は interval を再アームしません（tick ごとに `beat` を参照するため）。
- ある小節で `streamChunk[stream]` が未受信（`audio` 無し）または `streamFlagState[stream]` が false の場合、`quantizePlay` が呼ばれないため、その小節は発音も次バッファ要求も行われません（次にチャンクを受信するまで待ちになります）。

## バックエンドとの対応

| バックエンド | フロント |
| --- | --- |
| `BPM <n>`（`cmd/splitSpace/index.ts`）→ `execChangeBPM` → `bpm/changeBpm.ts` が `bpmFromServer {bpm, source}` を emit | `bpmFromServer()` が `quantizeState.bar` を更新し `refreshQuantizeInterval(true)` |
| `QUANTIZE ...`（`splitQuantize`）/ `QUANTIZE`（`quantizeCmd`）→ `setBpmState` + `quantizeEmit`（`socket/ioEmit.ts`）が `quantizeFromServer`（bare）を emit | `quantizeFromServer()` が `stream[*].flag/beat` を更新 |
| `BEAT <n\|RANDOM>`（`splitSpace/index.ts` / `numTarget.ts`）→ `splitBeat` → `splitBeat.ts` の `emitSplitBeat` が `quantizeParamFromServer {data, stream}` を emit | `quantizeParamFromServer()` が対象 `stream[*].beat` を更新（`flag` は変更しない） |

## テスト（`packages/frontend/test/quantize/`）

- `quantizeStop.test.ts` … `interval` 停止、`intervalFlag` / 各 `stream[*].flag` のリセット、`clearInterval` 呼び出しを検証。
- `quantizeFromServer.test.ts` … flag/beat 反映、ON→OFF の `streamChunk` 破棄と CHAT の `chatReq`、`playPendingQuantizeChunk` の初回即再生（pending 消費・flag false 時は再生しない）、`refreshQuantizeInterval` の稼働中抑止／全 false 停止／BPM 変更の位相保持再アームを検証。
- `bpmFromServer.test.ts` … ストリーム指定で `bar` 更新と `refreshQuantizeInterval(true)`、METRONOME / MODULATION / 非配列 source の分岐を検証。
- `quantizeParamFromServer.test.ts` … 対象 stream の beat のみ反映（flag 不変）、`streams` 外・`data` なしは更新しない、CHAT beat の canvas 表示を検証。
- `quantizePlay.test.ts` は未作成（state・Web Audio 依存）。

## 既知の注意点

- `src/quantize/old_setQuantize.ts` は未使用。
- `src/quantize/setQuantize.ts` は削除済み（旧 `setQuantize.test.ts` も削除済み）。
- `quantizeFromServer` の第 2 引数 `bpm` は現行の呼び出しでは未使用。
- `quantizeState.intervalFlag` / `quantizeState.currentTime` は書き込みのみで参照されていません。
- `src/stream/socketFromServer/chatFromServer.ts` は現在使用されていません（`stream/index.ts` から export されているだけ）。実際の CHAT バッファリングは `src/socket.ts` の `chatFromServer` ハンドラが担います。
- バックエンド `src/stream/quantize/emitQuantize.ts` は未使用です。実際の emit は `src/socket/ioEmit.ts` の `quantizeEmit` です。
