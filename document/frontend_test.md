# Frontend テストドキュメント

## 概要

`packages/frontend/` に対する vitest ベースの単体テスト。

- **テストランナー**: vitest 3.0.8（リポジトリルートの devDependency）
- **対象**: `packages/frontend/src/**` 配下で「値を返す純粋関数」と「値を返す state 依存関数」（純粋に近い計算ロジック）
- **対象外**: DOM / Web Audio API / Canvas / WebSocket / WebRTC / face-api.js / hls.js / vosk-browser / MediaStream など、ブラウザ API に深く結合した関数。これらは戻り値を持たない / `void` の関数も多く、本テストではスコープ外。
- **テスト規模**: 5 ファイル / 22 ケース（全合格）

実行コマンド:
```bash
pnpm -F frontend test
# または
pnpm -F frontend exec vitest run
```

## 設定ファイル

### `packages/frontend/vitest.config.ts`
- `include: ["test/**/*.test.ts"]`
- `globals: true`
- `environment: "node"` — `jsdom` パッケージ未インストールのため Node 環境で動かす。必要な `window`/`WebSocket` は setup でスタブ化。
- `setupFiles: ["./test/setup.ts"]`

### `packages/frontend/test/setup.ts`
- Node には `window` が無いため、`globalThis.window = globalThis` のエイリアスを張り、最小限の `window.location` を生やす。これで `window.setInterval` など `window` 経由の API が透過的に Node の同名関数に解決される。
- `WebSocket` は `SocketFacade.ts` の class 定義を import するためだけの最小スタブ。本テストの対象（`serialize` / `deserialize` モジュール関数）は WebSocket に触れない。

## テスト方針

| 区分 | 取り扱い |
|---|---|
| 純粋関数 | そのまま import してテスト |
| state 依存関数 | `vi.mock("../../src/state", ...)` などで state を差し替え |
| ブラウザ API 依存（DOM/Canvas/Web Audio/WebRTC/face-api 等） | テスト対象外 |
| ローカル（非 export）純粋関数 | source 側に `export` を追加して個別テスト |
| ケース数 | ハッピーパス + 主要なエッジケース 数件 |
| ファイル単位 | 1 関数 = 1 テストファイル（`<funcName>.test.ts`） |

タイマーは `vi.useFakeTimers()`、`Math.random` は `vi.spyOn(Math, "random").mockReturnValue(...)` で固定。

## ソース側の変更（テストのため `export` を追加）

純粋なローカルヘルパーをテスト対象にするため以下を export 化:

- `src/socket/SocketFacade.ts` → `serialize` / `deserialize`
- `src/webaudio/sound/bass.ts` → `setBassNote`

## テストファイル一覧

### PURE 関数

| テストファイル | 対象関数 | ソース | ケース内容 |
|---|---|---|---|
| `test/socket/SocketFacade/serialize.test.ts` | `serialize` | `src/socket/SocketFacade.ts` | { type, data } JSON 化 / ArrayBuffer マーカ変換 / ネスト ArrayBuffer / data=undefined / 8KB を超える ArrayBuffer (CHUNK 境界) |
| `test/socket/SocketFacade/deserialize.test.ts` | `deserialize` | 同上 | 通常 JSON / __type=ArrayBuffer 復元（バイト一致） / ネスト ArrayBuffer / serialize→deserialize ラウンドトリップ |
| `test/webaudio/sound/setBassNote.test.ts` | `setBassNote` | `src/webaudio/sound/bass.ts` | 確率テーブルの境界値（0/0.45/0.6/0.8/0.95）/ 戻り値が許容セットに含まれることを random 全範囲で確認 |

### STATE_READ 関数（`vi.mock` で state を差し替え）

| テストファイル | 対象関数 | ソース | ケース内容 |
|---|---|---|---|
| `test/quantize/quantizeStop.test.ts` | `quantizeStop` | `src/quantize/quantizeStop.ts` | bar/beat/interval をコピーし flag=false / stream=[] / timeout=0 を返す / interval=null でも壊れない / clearInterval 呼び出し確認 |
| `test/quantize/setQuantize.test.ts` | `setQuantize` | `src/quantize/setQuantize.ts` | interval=null から新規生成 / 同 bar はクリアのみ / 異 bar は再生成 / 複数 stream で最後の値が結果に残る |

## 共通テクニック

### state のモック差し替え
```ts
vi.mock("../../src/state", () => ({
  quantizeState: { flag: false, bar: 0, /* ... */ },
}));
import { quantizeStop } from "../../src/quantize/quantizeStop";
import { quantizeState } from "../../src/state";
// テスト内で quantizeState.bar = 500 のように書き込んで条件を作る
```

### `Math.random` の固定
```ts
vi.spyOn(Math, "random").mockReturnValue(0.45);
```

### `window.setInterval` の制御
`test/setup.ts` で `globalThis.window = globalThis` を貼っているので、`vi.useFakeTimers()` で Node 側のタイマーを差し替えるだけで `window.setInterval` も同時に偽装される。

## スコープ外の関数

戻り値を持たない（`void`）か、ブラウザ API に深く結合しているため未テスト:

- **DOM / Canvas**: `canvasEvent/*`（`canvasSizing` / `flickering` / `initVideo` / `showImage` / `textPrint` / `eraseText` / `print` / `toBase64` 他）
- **Web Audio API**: `webaudio/sound/*`（`bass` 本体 / `click` / `feedback` / `metronome` / `simulate` / `sinewave` / `whitenoise` / `accelarateOsc` / `gpsOsc`） / `webaudio/init/initAudio` / `webaudio/params/gainChange`
- **WebSocket / SocketFacade**: `connectWebSocket` / `keyDown` / `cmdMessage` / `SocketFacade.{constructor,_connect,emit,connect}`（クラスメソッド）
- **MediaStream / Recording**: `recording/*` / `scriptProcessor/*` / `stream/init/initAudioStream` / `stream/play/playAudioStream` / `stream/play/streamPlay` / `stream/socketFromServer/*` / `stream/chatReq`
- **WebRTC / face-api**: `faceApi/index` / `initialize.ts` / `initializeSnowleopard.ts`
- **navigator API**: `gps/index`（Geolocation） / `sensor/index`（DeviceMotionEvent）
- **その他**: `voice/index`（speechSynthesis） / `clientMode/clockMode` / `socket.ts` / `textInput.ts` の `keyDown` / `cmd/*` / `quantize/quantizeFromServer` / `quantize/quantizePlay` / `quantize/old_setQuantize`

これらは E2E もしくは結合テスト（実ブラウザを伴う）の対象とすることを推奨。
