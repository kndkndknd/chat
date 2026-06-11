# snowleopard.html 実装ドキュメント

古いブラウザ (Mac OS X 10.6 Snow Leopard 時代の Safari など、AudioWorklet および `navigator.mediaDevices.getUserMedia` 非対応環境) 向けのフロントエンドエントリポイント。

`index.html` と機能的にほぼ同一だが、Web Audio API と getUserMedia の呼び出し方を旧仕様に置き換えてある。

---

## 全体アーキテクチャ

```
                   ┌─────────────────────────────┐
                   │       html/index.html        │  モダンブラウザ向け
                   │   ↓ <script> main.ts          │
                   │   ├ initialize.ts             │
                   │   │   └ navigator.mediaDevices │
                   │   │       .getUserMedia (Promise)
                   │   ├ chatWorklet  (AudioWorklet)
                   │   ├ whitenoiseWorklet         │
                   │   └ simulateWorklet           │
                   └─────────────────────────────┘

                   ┌─────────────────────────────┐
                   │   html/snowleopard.html      │  旧ブラウザ向け
                   │   ↓ <script> snowleopardMain.ts
                   │   ├ initializeSnowleopard.ts  │
                   │   │   └ navigator.getUserMedia (callback)
                   │   ├ chatScriptProcessor       │
                   │   │   (createScriptProcessor)  │
                   │   ├ whitenoiseScriptProcessor │
                   │   └ simulateScriptProcessor   │
                   └─────────────────────────────┘
                          │  共通モジュール
                          ▼
   state / canvasEvent / stream / webaudio(initAudio)
   socket / SocketFacade / recording / faceApi / sensor / gps
```

旧版は **AudioWorkletNode を ScriptProcessorNode に置き換え**、**getUserMedia をコールバック型でラップ** する以外、既存モジュールをそのまま流用している。

---

## ディレクトリ構成

```
packages/frontend/
├── html/
│   ├── index.html
│   └── snowleopard.html               ← 旧ブラウザ用エントリ
├── src/
│   ├── main.ts
│   ├── snowleopardMain.ts             ← 旧ブラウザ用メイン
│   ├── initialize.ts
│   ├── initializeSnowleopard.ts       ← 旧ブラウザ用 initialize
│   ├── audioWorklet/                  (既存、モダン用)
│   │   ├ chatWorklet.ts
│   │   ├ whitenoiseWorklet.ts
│   │   └ simulateWorklet (main.ts 内で呼び出し)
│   ├── scriptProcessor/               ← 新規
│   │   ├ index.ts                     (バレル)
│   │   ├ chatScriptProcessor.ts
│   │   ├ whitenoiseScriptProcessor.ts
│   │   └ simulateScriptProcessor.ts
│   └── webaudio/init/initAudio.ts     (whitenoise 初期化関数を引数化)
└── vite.config.ts                     (snowleopard を rollupOptions.input に追加)
```

---

## 旧ブラウザ向けに置き換えた箇所

### 1. getUserMedia

| | モダン (`initialize.ts`) | 旧 (`initializeSnowleopard.ts`) |
| --- | --- | --- |
| 呼び出し | `navigator.mediaDevices.getUserMedia(constraints)` | `navigator.getUserMedia(constraints, success, error)` (vendor prefix 含む) |
| 戻り値 | Promise | コールバック (Promise でラップ) |
| 制約取得 | `getSupportedConstraints()` を参照 | 使用しない |
| デバイス列挙 | `enumerateDevices()` で deviceId 指定 | 使用しない (`{video: true, audio: true}` のみ) |

```ts
// initializeSnowleopard.ts (抜粋)
const getLegacyGetUserMedia = (): LegacyGetUserMedia | null => {
  const nav = navigator as any;
  const gum =
    nav.getUserMedia ||
    nav.webkitGetUserMedia ||
    nav.mozGetUserMedia ||
    nav.msGetUserMedia;
  return gum ? gum.bind(navigator) : null;
};

const legacyGetUserMedia = (constraints) =>
  new Promise<MediaStream>((resolve, reject) => {
    getLegacyGetUserMedia()!(constraints, resolve, reject);
  });
```

### 2. AudioWorklet → ScriptProcessor

| 用途 | モダン (AudioWorklet) | 旧 (ScriptProcessor) |
| --- | --- | --- |
| マイク入力バッファリング | `chatWorklet.ts` + `chat-processor.js` | `chatScriptProcessor.ts` |
| ホワイトノイズ生成 | `whitenoiseWorklet.ts` + `whitenoise-processor.js` | `whitenoiseScriptProcessor.ts` |
| 周波数推定 (WASM FFT) | `simulateWorklet.ts` + `simulate-worklet.js` | `simulateScriptProcessor.ts` |

ScriptProcessor は **メインスレッド** で `onaudioprocess` イベントを発火するため、ワークレットスレッドとの `port.postMessage` 通信は不要。バッファは直接処理してそのまま `socket.emit` などに渡す。

#### chatScriptProcessor

- `createScriptProcessor(bufferSize, 1, 1)` (`bufferSize = bufferSizeState.bufferSize`、デフォルト 8192)
- `event.inputBuffer.getChannelData(0)` をコピーして `socket.emit("workletBufferFromClient", ...)` で送信 (モダン版と完全に同じプロトコル)
- `audioWorkletState.chat.flag` (CHAT / PLAYBACK / TIMELAPSE) は既存ロジックをそのまま流用
- ScriptProcessorNode は **destination に接続されないと発火しない** ため、出力を 0 で埋め、ゲイン 0 のノードを介して `ctx.destination` に接続する

#### whitenoiseScriptProcessor

- `createScriptProcessor(4096, 0, 2)` (入力 0ch・出力 2ch)
- 出力チャネルに `(Math.random() * 2 - 1) * 0.5` を書き込む
- `audioWorkletState.whitenoise.audioWorklet` に格納し、`initAudio` 内で `gainState.whitenoiseGain` 経由で `masterGain` に接続される (モダン版と同じ配線パス)

#### simulateScriptProcessor

- `createScriptProcessor(4096, 1, 1)` で stream を受け、内部で 8192 サンプルバッファに溜める
- 8192 たまった時点で `wasm/simulate.js` の `find_dominant_frequency(samples, sampleRate)` を呼び、結果を `oscState.simulateOsc.frequency.setTargetAtTime(...)` に反映
- 出力は無音 (0 fill)、ただし `ctx.destination` に接続して発火させる

---

## ステート互換性

`audioWorkletState` の型を以下のように拡張し、AudioWorkletNode・ScriptProcessorNode いずれも格納可能にした:

```ts
// state/webAudio/audioWorkletState.ts
export const audioWorkletState = {
  chat: {
    audioWorklet: null as AudioWorkletNode | ScriptProcessorNode | null,
    length: 8192,
    flag: { CHAT: false, PLAYBACK: false, TIMELAPSE: false } as { [key: string]: boolean },
  },
  whitenoise: {
    audioWorklet: null as AudioWorkletNode | ScriptProcessorNode | null,
  },
};
```

`chatWorklet.ts:setBufferLengthState` は AudioWorkletNode 固有の `.port.postMessage` を呼ぶため、`"port" in node` で型ナローイングしてから呼ぶように変更した (旧版経路では呼ばれない想定)。

---

## initAudio の差し替え点

`webaudio/init/initAudio.ts` は whitenoise の初期化関数を引数で受け取るように変更:

```ts
export const initAudio = async (
  initWhitenoise: () => Promise<void> = initWhitenoiseWorklet,
) => {
  ...
  await initWhitenoise();   // 旧版では initWhitenoiseScriptProcessor を渡す
  ...
};
```

それ以外 (オシレータ、ゲイン、コンボルバ、フィルタ、ステレオパナーの構築) はモダン・旧で完全共通。

---

## エントリポイント (snowleopardMain.ts)

`main.ts` とほぼ同一だが、以下の差し替えのみ:

| 箇所 | main.ts | snowleopardMain.ts |
| --- | --- | --- |
| クリック / Enter で呼ぶ初期化 | `initialize(socket)` | `initializeSnowleopard(socket)` |
| ストリーム取得後の周波数解析 | `simulateWorklet(stream)` | `simulateScriptProcessor(stream)` |
| 失敗時テキスト | `"not support navigator.mediaDevices.getUserMedia"` | `"not support navigator.getUserMedia"` |

それ以外 (WebSocket 接続、`canvasSizing`、`keyDown`、`flagState.isMobile` 判定、`SpeechSynthesisUtterance` 生成、`socket()` ハンドラ登録、`webRtcState.videoPlayer` 取得、初期 `textPrint` 呼び出し) は同じ。

---

## MediaRecorder の取り扱い

旧 Safari では `MediaRecorder` 未実装。`initializeSnowleopard.ts` 末尾で:

```ts
if (typeof MediaRecorder !== "undefined") {
  startChunkedRecording(stream);
} else {
  console.warn("MediaRecorder is not supported in this browser");
}
```

としており、未実装環境ではチャンク録画をスキップしてその他の機能 (chat / sensor / face / timelapse) は継続動作する。

---

## ビルド設定

`vite.config.ts` の `rollupOptions.input` に追加:

```ts
input: {
  main: "./html/index.html",
  snowleopard: "./html/snowleopard.html",
},
```

ビルド成果物として `packages/backend/static/html/snowleopard.html` (および対応する `snowleopard.js`) が出力される。

---

## アクセス方法

```
モダン:    https://<host>/                     → index.html → main.ts
旧版:      https://<host>/snowleopard.html     → snowleopard.html → snowleopardMain.ts
```

URL のパス判定 (`includes("noStream")` / `includes("face")` / `includes("pi")` 等) は両エントリで共通仕様のまま動作する。

---

## 既知の制約 (Snow Leopard 環境)

- `MediaRecorder` 不可 → チャンク録画スキップ
- `mediaDevices.enumerateDevices` 不可 → `pi` パスでのデバイス指定 (`mics[2].deviceId`) は無効、デフォルトデバイスのみ使用
- `getSupportedConstraints` 不可 → torch (フラッシュライト) 機能は使えない
- `import()` (動的 import) は Vite 側でバンドルされるが、対応していないブラウザでは fallback がない (要検証)
- `SpeechSynthesisUtterance` も古い Safari では未実装の可能性あり (要検証)
