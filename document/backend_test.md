# Backend テストドキュメント

## 概要

`packages/backend/` に対する vitest ベースの単体テスト。

- **テストランナー**: vitest 3.0.8（リポジトリルートの devDependency）
- **対象**: `packages/backend/src/**` 配下で「値を返す純粋関数」と「値を返す state 依存関数」（純粋に近い計算ロジック）
- **対象外**: 外部 I/O（Redis/Mongo/fs/sharp/spawn/werift/HTTP/socket等）に直接触れる関数。これらは `vi.mock` で差し替え不能なほど深く I/O と結合しているもの、または副作用が中心で戻り値を持たないものは除外。
- **テスト規模**: 42 ファイル / 156 ケース（全合格）

実行コマンド:
```bash
pnpm -F backend test
# または
pnpm -F backend exec vitest run
```

## 設定ファイル

### `packages/backend/vitest.config.ts`
- `include: ["test/**/*.test.ts"]` — テストは `test/` 配下のみスキャン
- `globals: true`
- `environment: "node"`
- `setupFiles: ["./test/setup.ts"]`

### `packages/backend/test/setup.ts`
`ioredis` をグローバルにモック。`src/state/states/*` は import 時に `createPersistedState` 経由で Redis を触るため、setup でこれを潰しておかないと state を import した瞬間に実 Redis 接続を試みる。`MockRedis` クラスで `get/set/del/incr/rpush/lpop/lindex/llen/lrange/sadd/sismember/smembers/exists/quit/disconnect/on/off/once` を no-op 化。

## テスト方針

| 区分 | 取り扱い |
|---|---|
| 純粋関数（外部依存・state 参照なし） | そのまま import してテスト |
| state 依存関数 | `vi.mock("../../src/state", ...)` などで state を差し替え、テスト内で値をセット |
| 外部依存（Redis 直接呼び出し等） | テスト対象外（純粋ロジック部分のみ抽出してテスト） |
| ローカル（非 export）純粋関数 | source 側に `export` を追加して個別テスト |
| ケース数 | ハッピーパス + 主要なエッジケース 数件 |
| ファイル単位 | 1 関数 = 1 テストファイル（`<funcName>.test.ts`）。ソースに複数 export がある場合は同名サブディレクトリで分割 |

`Math.random` を使う関数は `vi.spyOn(Math, "random").mockReturnValue(...)` で固定。`setTimeout` 系は `vi.useFakeTimers()`。

## ソース側の変更（テストのため `export` を追加）

純粋なローカルヘルパーをテスト対象にするため以下を export 化:

- `src/cmd/splitSpace/modulationByBPM.ts` → `calculateModulationFrequency`
- `src/redis/streamsRedis.ts` → `buffKey` / `indexKey` / `serializeStream` / `deserializeStream` / `deserializeChat`
- `src/redis/stateRedis.ts` → `makeDeepProxy` / `debounce`
- `src/socket/IoFacade.ts` → `serializeMessage`
- `src/socket/wsServer.ts` → `deserialize`
- `src/clientSetting/clientSettingsEmit.ts` → `buildPayload`
- `src/cmd/pickupCmdTarget.ts` → `commonPickupCmdTarget`

## テストファイル一覧

### PURE 関数（外部・state 依存なし）

| テストファイル | 対象関数 | ソース | ケース内容 |
|---|---|---|---|
| `test/cmd/splitSpace/getTypeArr.test.ts` | `getTypeArr` | `src/cmd/splitSpace/getTypeArr.ts` | 数字/英字/空文字/混在/空配列/混在配列を分類 |
| `test/cmd/splitSpace/modulationByBPM.test.ts` | `modulationByBPM` | `src/cmd/splitSpace/modulationByBPM.ts` | 先頭は baseFrequency / index 別の周波数計算 / 空配列 / BPM<=0 はエラー |
| `test/cmd/splitSpace/calculateModulationFrequency.test.ts` | `calculateModulationFrequency` | 同上 | plusminus=true/false / period<=0 でエラー / 非整数 period |
| `test/cmd/splitSpace/classifyArgs.test.ts` | `classifyArgs` | `src/cmd/splitSpace/splitQuantize.ts` | 空 / TRUE-FALSE / stream / beat<=32 / bpm>=33 / 4 要素混在 / 不正値破棄 / 重複は最初優先 / trim |
| `test/route/selectOtherClient.test.ts` | `selectOtherClient` | `src/route.ts` | 空 rooms / 単一キー / 複数キー（source 除外） |
| `test/route/pickupTarget.test.ts` | `pickupTarget` | 同上 | adapter.rooms 未定義 / list キーマッチ / list 空 / undefined 値スキップ |
| `test/route/pickCmdTarget.test.ts` | `pickCmdTarget` | 同上 | duplicate 経路 / none 経路 / 最小 timestamp 経路 / room フィルタ |
| `test/route/cmdSelect.test.ts` | `cmdSelect` | 同上 | 不一致 / 一致 (now=false → flag=true) / 一致 (now=true → flag=false) |
| `test/redis/streamsRedis/buffKey.test.ts` | `buffKey` | `src/redis/streamsRedis.ts` | 通常 / 空文字 |
| `test/redis/streamsRedis/indexKey.test.ts` | `indexKey` | 同上 | 通常 / 空文字 |
| `test/redis/streamsRedis/serializeStream.test.ts` | `serializeStream` | 同上 | audio が base64 化 / 空 audio |
| `test/redis/streamsRedis/deserializeStream.test.ts` | `deserializeStream` | 同上 | serialize→deserialize ラウンドトリップ / 空 audio |
| `test/redis/streamsRedis/deserializeChat.test.ts` | `deserializeChat` | 同上 | base64 audio → ArrayBuffer 復元 / 空 audio |
| `test/redis/stateRedis/makeDeepProxy.test.ts` | `makeDeepProxy` | `src/redis/stateRedis.ts` | get / set で onChange / delete で onChange / ネスト set で onChange / 配列 push で onChange |
| `test/redis/stateRedis/debounce.test.ts` | `debounce` | 同上 | ms 経過後 1 回呼ぶ / 連続呼び出しは最後から ms 後に 1 回 |
| `test/stream/bufferSizeChange.test.ts` | `bufferSizeChange` | `src/stream/bufferSizeChange.ts` | 0/負値 → 256 / 各段階の境界値 / >8192 → 16384 |
| `test/stream/mergeStreamTarget.test.ts` | `mergeStreamTarget` | `src/stream/mergeStreamTarget.ts` | flatten + 重複除去 / 空ターゲット / target 空 |
| `test/stream/toPostgres/decodeAudio.test.ts` | `decodeAudio` | `src/stream/toPostgres/getStream.ts` | base64 → ArrayBuffer 復元 / 空文字 |
| `test/socket/IoFacade/serializeMessage.test.ts` | `serializeMessage` | `src/socket/IoFacade.ts` | { type, data } JSON 化 / ArrayBuffer マーカ変換 / ネスト ArrayBuffer / data=undefined |
| `test/socket/IoFacade/generateId.test.ts` | `IoFacade.generateId` | 同上 | UUID v4 形式 / 呼ぶたび異なる ID |
| `test/socket/IoFacade/to.test.ts` | `IoFacade.to` | 同上 | emit メソッド付きオブジェクト / OPEN な ws.send 呼び出し / 未登録 ID は no-op / CLOSED は send されない |
| `test/socket/wsServer/deserialize.test.ts` | `deserialize` | `src/socket/wsServer.ts` | 通常 JSON / __type=ArrayBuffer 変換 / ネスト ArrayBuffer<br>※Node Buffer pool の仕様で返却 ArrayBuffer は実バイト長以上になり得る点に注意。バイト一致は検証していない |
| `test/schedule/exchangeRelativeSchedule.test.ts` | `exchangeRelativeSchedule` | `src/schedule/exchangeRelativeSchedule.ts` | 先頭起点の相対時刻 ms / ms 付き日時 / 1 件のみ |
| `test/schedule/getScheduleFromJson.test.ts` | `getScheduleFromJson` | `src/schedule/getScheduleFromJson.ts` | 通常日時 → 相対 ms / 0000-00-00 はじまり → getTime ベース / 1 件のみ |
| `test/stream/quantize/decideQuantizeFromAverage.test.ts` | `decideQuantizeFromAverage` | `src/stream/quantize/decideQuantizeFromAverage.ts` | argParams 指定で固定値 / argParams 未指定で平均値ベース（quantizeFlag は多数決） / flag のみ指定で bpm/beat は平均 |
| `test/stream/quantize/decideFlagFromAverage.test.ts` | `decideFlagFromAverage` | `src/stream/quantize/decideFlagFromAverage.ts` | 過半数 true → false / 半数以下 → true / clientTarget フィルタ / streamTarget フィルタ |
| `test/stream/uploadModule/durationPattern.test.ts` | `durationPattern` | `src/stream/uploadModule/durationPattern.ts` | duration<20 / duration>60 / HH:MM:SS / MM:SS / FULL / length=4 で t も上書き |

### STATE_READ 関数（`vi.mock` で state を差し替え）

| テストファイル | 対象関数 | ソース | ケース内容 |
|---|---|---|---|
| `test/clientSetting/clientSettingsEmit/buildPayload.test.ts` | `buildPayload` | `src/clientSetting/clientSettingsEmit.ts` | client なし → null / facedetection が AND で算出 / personDetectState.flag=false で false / hanged そのまま |
| `test/clientSetting/connectFromClient.test.ts` | `connectFromClient` | `src/clientSetting/connectFromClient.ts` | /nosound 早期 return / /1 で facedetection client 登録 / /3 で hanged / clientMode='client' /project / clientMode='noStream' / clientMode='arduinoClient' / urlPathName 'pi' で arduinoState.host 設定 |
| `test/clientSetting/floatingPosition.test.ts` | `floatingPosition` | `src/clientSetting/floatingPosition.ts` | 既存 client は自分の position / projection 0 件 default / 非 projection 1 件 case 1 / projection あり時の基準 |
| `test/cmd/charProcess.test.ts` | `charProcess` | `src/cmd/charProcess.ts` | Enter で空文字 / ArrowUp で getLogCmd 戻り値 / Backspace で末尾削除 / Tab・ArrowRight で空文字 / Escape / 通常文字連結 / BASS で previousState 更新 / Shift で変化なし |
| `test/cmd/pickupCmdTarget/commonPickupCmdTarget.test.ts` | `commonPickupCmdTarget` | `src/cmd/pickupCmdTarget.ts` | option.target 優先 / CLICK ランダム / BASS の既存・空ケース / SIMULATE 全件 / SINEWAVE 未発音/同周波数/未発音端末優先 / default ケース |
| `test/cmd/pickupCmdTarget/pickupCmdTarget.test.ts` | `pickupCmdTarget` | 同上 | CLICK ランダム / option.target |
| `test/cmd/pickupCmdTarget/pickupPaCmdTarget.test.ts` | `pickupPaCmdTarget` | 同上 | CLICK で paCmdClient ランダム / option.target |
| `test/logging/getLogCmd.test.ts` | `getLogCmd` | `src/logging/getLogCmd.ts` | ArrowUp で 1 つ前 / ArrowUp 連打 / ArrowDown で 0 まで戻すと空 / 不一致キー＋num=0 で空文字 |
| `test/stream/gridTimeoutVal.test.ts` | `gridTimeoutVal` | `src/stream/gridTimeoutVal.ts` | stream 存在時はその bpm / 不在時は METRONOME.bpm |
| `test/stream/pickupStreamTarget/pickupStreamTarget.test.ts` | `pickupStreamTarget` | `src/stream/pickupStreamTarget.ts` | target 1 件 / 複数件ランダム / CHAT は from 除外 / 除外で空なら from 返却 / target 未定義は streamClient / どちらも無ければ空 |
| `test/stream/pickupStreamTarget/pickupPaStreamTarget.test.ts` | `pickupPaStreamTarget` | 同上 | paStreamClient 空 → 空文字 / 非空からランダム |
| `test/stream/sampleRateRandomize.test.ts` | `sampleRateRandomize` | `src/stream/sampleRateRandomize.ts` | random / diatonic / diatonic で min>max エラー / serial |
| `test/stream/genEmptyBuff.test.ts` | `genEmptyBuff` | `src/stream/genEmptyBuff.ts` | basisBufferSize 個の Float32 で全て 1.0 |
| `test/stream/quantize/quantize.test.ts` | `quantize` | `src/stream/quantize/quantize.ts` | splited=false で多数決（true 1 件 → 全 true 化） / splited=true は state 透過 / 過半数 true で全 false 化 |
| `test/stream/quantize/setParamsSplitQuantize.test.ts` | `setParamsSplitQuantize` | `src/stream/quantize/setParamsSplitQuantize.ts` | 全 true なら true 維持 / 1 つでも false なら全 false / params.flag=true で対象更新 / beat,bpm 反映 / params.stream で部分更新 / target 未指定で全 client |

## 共通テクニック

### state のモック差し替え（`vi.mock` のホイスト挙動）
`vi.mock("../../src/state", () => ({...}))` はファイル先頭にホイストされるため、import 文より前に書く必要はないが、ファクトリ内で外側変数を参照する場合は `vi.hoisted` を使う:

```ts
const { ioMock } = vi.hoisted(() => ({
  ioMock: { emit: vi.fn(), to: vi.fn(() => ({ emit: vi.fn() })) },
}));
vi.mock("../../src/state/states/ioState", () => ({ ioState: { io: ioMock } }));
```

### `Math.random` の固定
```ts
beforeEach(() => { vi.spyOn(Math, "random").mockReturnValue(0); });
afterEach(() => { vi.restoreAllMocks(); });
```

### state 共有問題の回避
state を `vi.mock` で出した object はテスト間で共有されるため、`beforeEach` でリセット（`for (const k of Object.keys(state)) delete state[k];` など）する。

## 既存テストの取り扱い

| 旧テスト | 措置 |
|---|---|
| `test/schedule/getScheduleFromJson.test.ts` | 拡張（エッジケース 2 件追加） |
| `test/stream/quantize/decideQuantizeFromAverage.test.ts` | 期待値修正（`gridFlag = !quantizeFlag` に合わせて書き直し） |
| `test/stream/quantize/setParamsSplitQuantize.test.ts` | 全面書き直し（旧テストは古いシグネチャ・古い戻り値を想定して FAIL していた） |
| `test/stream/quantize/quantizeCmd.test.ts` | **削除**（現状の `quantizeCmd` は `void` を返す関数に変更されており、純粋関数テスト方針の対象外） |

## スコープ外の関数

戻り値はあるが外部 I/O 中心のため未テスト:

- `src/arduinoAccess/arduinoAccess.ts`（HTTP）
- `src/mongoAccess/findStream.ts`（HTTP）
- `src/rotate/m5Access.ts` の `m5Switch` / `m5Test`（HTTP）
- `src/scenario/loadScenario.ts`（fs）
- `src/schedule/getJsonFromFile.ts` / `getScheduleFile.ts` / `getScheduleFromSplitSpace.ts`（fs/HTTP）
- `src/logging/putLogFile.ts`（fs）
- `src/redis/stateRedis.ts` の `createPersistedState`（Redis）
- `src/redis/streamsRedis.ts` の async API（`hasKey` / `getAllKeys` / `push` / `get` / `getLength` 等、Redis）
- `src/stream/getLiveStream.ts`（spawn/HTTP）
- `src/stream/glitchStream.ts`（sharp）
- `src/stream/uploadModule/*`（spawn/fs）
- `src/stream/toPostgres/getStream.ts` の `getStream` / `postStream.ts` の `postStream`（HTTP/Redis）
- `src/stream/uploadModule/getDuration.ts`（spawn）
- `src/socket/wsServer.ts` の `wsServer`（ws サーバ起動）

これらは結合テスト（実 Redis/Mongo/ファイルを伴う）の対象とすることを推奨。
