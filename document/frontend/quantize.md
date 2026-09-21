# Frontend Quantize 実装

## 概要

サーバから送られる BPM / クオンタイズ設定を受け取り、対象ストリーム（`CHAT` / `PLAYBACK` / `TIMELAPSE`）の音声・映像バッファを小節単位で再生するフロントエンドの仕組みです。

- バックエンドはクライアント単位で `bpmState[client]`（`bpmClientStateType`）を保持し、`bpmState[client].stream`（`bpmStreamStateType`）に各ストリームのクオンタイズ状態を持ちます。
- 値を変更したタイミングで `bpmFromServer` / `quantizeFromServer` / `quantizeParamFromServer` を emit し、フロントは `quantizeState` に反映して `quantizePlay` で再生します。
- BPM（小節長）は `bpmFromServer`、クオンタイズ ON/OFF は `quantizeFromServer`、`splitBeat`（`BEAT` コマンド）による beat 変更は `quantizeParamFromServer` が担当する分離構成です。

### 関連ファイル

| ファイル | 役割 |
| --- | --- |
| `src/state/quantizeState.ts` | フロントのクオンタイズ状態（`quantizeType`）。 |
| `src/quantize/bpmFromServer.ts` | `bpmFromServer` ハンドラ。小節長（`bar`）を更新。 |
| `src/quantize/quantizeFromServer.ts` | `quantizeFromServer` ハンドラ。flag/beat 反映と interval 管理。 |
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
| `interval` | `number \| null` | `window.setInterval` の ID。 |
| `currentTime` | `number` | 直近 tick の `audioContext.currentTime`（記録用）。 |
| `timeout` | `number` | 未使用。 |
| `intervalFlag` | `boolean` | interval が稼働中かどうか。 |
| `stream` | `{ [stream: string]: { flag: boolean; beat: number } }` | ストリーム別のクオンタイズ設定。`CHAT` / `PLAYBACK` / `TIMELAPSE` を保持。 |

- `stream[<name>].flag` … そのストリームのクオンタイズ ON/OFF。
- `stream[<name>].beat` … 1 小節内の分割数。`0` は「ランダム」を意味します。

### サーバ側 `bpmStreamStateType`（`types/bpmType.d.ts`）

```
{ [stream: string]: { beat: number; gridFlag: boolean; quantizeFlag: boolean } }
```

`bpm` / `latency` は含みません（クライアント単位の `bpmClientStateType.bpm` に集約）。

## サーバからのイベント

### `bpmFromServer` — `{ bpm: number; source: string[] }`

- 送信元: バックエンド `parameterChange/changeBpm.ts`（`BPM <n>` コマンドから呼ばれる `changeBPM`）。
- ハンドラ: `src/socket.ts` → `bpmFromServer(data)`。
- 処理（`src/quantize/bpmFromServer.ts`）:
  1. `source` が配列でなければ何もせず return。
  2. `source` ごとに分岐。
     - `"METRONOME"` … `metronomeState.bar = millisecondsPerBar(bpm)`。
     - `"MODULATION"` … 何もしない。
     - それ以外（ストリーム名） … `quantizeState.bar = millisecondsPerBar(bpm)` とし、変更フラグを立てる。
  3. ストリームの `bar` が変わった場合のみ `refreshQuantizeInterval()` を呼ぶ。

### `quantizeFromServer` — `bpmStreamStateType`（bare）

- 送信元: バックエンド `stream/quantize/emitQuantize.ts`（`splitQuantize` / `quantizeCmd` から呼ばれる）。
- payload はラッパー無しの `bpmStreamStateType` です（`{ bpm, stream }` ではありません）。
- ハンドラ: `src/socket.ts` → `quantizeFromServer(data)`。
- 処理（`src/quantize/quantizeFromServer.ts`）:
  1. 第 2 引数 `bpm` が渡され、`> 0` なら `quantizeState.bar = millisecondsPerBar(bpm)`。
  2. `data` の各ストリームについて、`quantizeState.stream` にキーが存在すれば `flag = quantizeFlag`、`beat = beat` を反映。
  3. `refreshQuantizeInterval()` を呼ぶ。
  4. `quantizeState` を返す（呼び出し側では未使用）。

### `quantizeParamFromServer` — `{ data: bpmStreamStateType; stream: string[] }`

- 送信元: バックエンド `stream/quantize/splitBeat.ts` の `emitSplitBeat`（`BEAT` コマンドから呼ばれる `splitBeat`）。
- payload は `{ data, stream }` のラッパー形式です。`data` が `bpmStreamStateType`（bare）、`stream` が対象ストリーム名の配列です。
- ハンドラ: `src/socket.ts` → `quantizeParamFromServer(data.data, data.stream)`。
- 処理（`src/quantize/quantizeParamFromServer.ts`）:
  1. `quantizeState.stream` の各キーのうち、`streams` に含まれかつ `data[stream]` が存在するものについて `beat = data[stream].beat` を反映。
  2. `flag` は変更しません（ON/OFF は `quantizeFromServer` の担当）。
  3. `refreshQuantizeInterval()` は呼びません（`beat` は interval tick ごとに参照されるため、interval の再生成は不要）。

## 処理フロー

1. `socket.ts` が `bpmFromServer` / `quantizeFromServer` / `quantizeParamFromServer` を受信して各ハンドラを呼ぶ。
2. `quantizeState.bar` と `quantizeState.stream[*].flag/beat` を更新する（`quantizeParamFromServer` は `beat` のみ）。
3. `refreshQuantizeInterval()`（`quantizeFromServer.ts`）が interval を作り直す（`quantizeParamFromServer` では呼ばない）。
   - いずれかの `stream[*].flag` が `true` … `clearInterval` 後に `quantizeInterval(quantizeState.bar)` を開始し、`intervalFlag = true`。
   - すべて `false` … `clearInterval` のみ行い、`interval = null` / `intervalFlag = false`。
4. interval tick（`bar` ms ごと）で各ストリームを判定し、条件を満たせば `quantizePlay(streamChunk[stream], stream[stream].beat)` を呼ぶ。
   - 条件: `streamFlagState[stream]` が真、`streamChunk[stream]` が存在し `audio` がある、`stream[stream].flag` が真。
5. `quantizePlay` が小節内の分割タイミングで発音し、次バッファを要求する。

### CHAT のバッファリング

`src/socket.ts` の `chatFromServer` ハンドラで分岐します。

- `quantizeState.stream.CHAT.flag` が真かつ `data.source` が既知のストリーム … `streamChunk[data.source] = streamData` として保持し、interval 側で再生。
- それ以外 … `streamPlay` で即時再生。

## `quantizePlay` の詳細（`src/quantize/quantizePlay.ts`）

- `beat` の解決順:
  1. 引数 `beat` が `undefined` でなければそれを使用。
  2. なければ `quantizeState.stream[data.source]?.beat`。
  3. それも無ければ `1`。
  - 解決後の値が `0` の場合、`Math.pow(2, Math.floor(Math.random() * 6))` のランダム値に置き換え。
- `playCount` 回（`0 <= i < playCount`）、`(quantizeState.bar / playCount) * i` ms 後に `setTimeout` で発音。
- 発音時、`streamFlagState[data.source]` が真のときのみ:
  - `playAudioStream(audio, sampleRate, glitch, bufferSize)`
  - `video` があれば `showImage`（300ms 後に `erasePrint`）、無ければ `textPrint(source.toLowerCase())`
- 再生スケジュール後、次バッファを要求:
  - `source === "CHAT"` … `chatReq(socketId)`
  - それ以外 … `socket.emit("streamReqFromClient", source)`

## 停止（`src/quantize/quantizeStop.ts`）

- `clearInterval(quantizeState.interval)`、`interval = null`、`intervalFlag = false`、全 `stream[*].flag = false` を実行し `quantizeState` を返します。
- 現在 `src` からは呼ばれておらず、`quantize/index.ts` 経由の公開のみです。

## 単位・タイミングの注意

- `bar` はミリ秒です。`millisecondsPerBar(bpm) = 4 * 60000 / bpm`（`src/util/bpmCalc.ts`）。`bpmFromServer` / `quantizeFromServer` ともこの単位に統一されています。
- interval は `quantizeFromServer` / `bpmFromServer` のたびに作り直され、常に最新の `bar` を使用します。
- ある小節で `streamChunk[stream]` が未受信（`audio` 無し）または `streamFlagState[stream]` が false の場合、`quantizePlay` が呼ばれないため、その小節は発音も次バッファ要求も行われません（次にチャンクを受信するまで待ちになります）。

## バックエンドとの対応

| バックエンド | フロント |
| --- | --- |
| `BPM <n>`（`cmd/splitSpace/index.ts`）→ `changeBPM` → `changeBpm.ts` が `bpmFromServer {bpm, source}` を emit | `bpmFromServer()` が `quantizeState.bar` を更新 |
| `QUANTIZE ...`（`splitQuantize`）/ `QUANTIZE`（`quantizeCmd`）→ `setBpmState` + `emitQuantize` が `quantizeFromServer`（bare）を emit | `quantizeFromServer()` が `stream[*].flag/beat` を更新 |
| `BEAT <n\|RANDOM>`（`splitSpace/index.ts` / `numTarget.ts`）→ `splitBeat` → `splitBeat.ts` の `emitSplitBeat` が `quantizeParamFromServer {data, stream}` を emit | `quantizeParamFromServer()` が対象 `stream[*].beat` を更新（`flag` は変更しない） |

## テスト（`packages/frontend/test/quantize/`)

- `quantizeStop.test.ts` … `interval` 停止、`intervalFlag` / 各 `stream[*].flag` のリセット、`clearInterval` 呼び出しを検証。
- `setQuantize.test.ts` … `src/quantize/setQuantize.ts` は意図的に無効化（全コメント）のため `describe.skip`。型整合のみ維持。
- `bpmFromServer` / `quantizeFromServer` / `quantizeParamFromServer` / `quantizePlay` は state・ブラウザ API 依存のため未テスト（`document/frontend_test.md` の方針どおり）。

## 既知の注意点

- `src/quantize/setQuantize.ts` は全行コメントで無効、`old_setQuantize.ts` は未使用（型エラー回避のみ）。
- `bpmChange.ts` の `{ bpm, bar }` はデッドコードです。現行の `bpmFromServer` 送信元は `changeBpm.ts` の `{ bpm, source }` のみ。
- `src/stream/socketFromServer/chatFromServer.ts` は現在使用されていません（`stream/index.ts` から export されているだけ）。実際の CHAT バッファリングは `src/socket.ts` の `chatFromServer` ハンドラが担います。
