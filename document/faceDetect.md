# 顔認識（face-api.js）実装ドキュメント

`face-api.js` を用いたフロント側のリアルタイム顔検出と、バックエンドからの起動制御の実装説明。

---

## 全体アーキテクチャ

```
【外部システム】           【バックエンド】                       【フロントエンド】

POST /api/persondetect      app.ts                                socket.ts
{direction:"left"}    ──>     │                                     │
                              ▼                                     │
                    triggerLeftPersonDetect()                       │
                              │                                     │
                              │  15分タイマー管理                    │
                              ▼                                     │
                    personDetectState.flag                          │
                              │                                     │
                              │  flagの遷移時に再送                   │
                              ▼                                     │
                    broadcastClientSettings() ───────────────────>  │
                                          clientSettingsFromServer  │
                                                                    ▼
                                                     initFaceDetection() / stopFaceDetection()
                                                                    │
                                                                    ▼
                                                          face-api.js 検出ループ
                                                                    │
                                                                    │  faceDetectFromClient
                              <──────────────────────────────────────┘
                              │
                              ▼
                    PLAYBACK ストリーム再生（過去映像）
```

---

## モデルファイル

`packages/frontend/public/models/`（および `packages/backend/static/models/`）に以下を配置:

- `tiny_face_detector_model-*` — 顔検出
- `face_landmark_68_tiny_model-*` — 68点ランドマーク
- `face_expression_model-*` — 表情認識（現状ロードのみで未使用）

URI は `MODEL_URL = "/models"`。Express の static 配信から取得する。

---

## フロントエンド実装

### `packages/frontend/src/faceApi/index.ts`

#### モジュール状態

```ts
let overlayCanvas: HTMLCanvasElement | null = null;
let active = false;
let modelsLoaded = false;
let lastDetectedAt: number | null = null;

const MODEL_URL = "/models";
const COOLDOWN = 30000; // 30秒
```

#### `initFaceDetection()`

1. `active === true` なら早期 return（二重起動ガード）。
2. 初回のみ 3 つのモデルを `Promise.all` で並列ロードし、`modelsLoaded = true`。
3. `<canvas id="faceCanvas">` を生成し `#wrapper` に追加（`position:absolute; z-index:3; pointer-events:none`）。
4. `active = true` にし、`detectLoop()` を開始。

#### `detectLoop()`

- `setTimeout(detectLoop, 100)` による疑似ループ（約 10fps）。
- `video.readyState >= 2 && video.videoWidth > 0` のとき検出を実行:

  ```ts
  faceapi
    .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks(true)
    .withFaceExpressions();
  ```

- 結果を `window.innerWidth/innerHeight` にリサイズして描画。
- 顔検出時:
  - ランドマークを `drawFaceLandmarks` で描画。
  - **クールダウン (`COOLDOWN = 30000ms`)** を経過していれば、最初の顔の `detection.box` から `{x, width, height}` を `faceDetectFromClient` イベントでサーバーへ送信し、`lastDetectedAt = now`。
  - クールダウン中はサーバー送信せず描画のみ。

#### `stopFaceDetection()`

- `active = false` にしてループを終了させる。
- `overlayCanvas` のコンテキストをクリアして残像を消す。
- モデルとオーバーレイ要素は再起動高速化のため保持。

---

## 起動条件

顔認識は以下 **両方** が `true` のときのみ起動する:

1. **クライアント条件**: バックエンドの `clientState.client[id].facedetection`
   - `connectFromClient` での URL パス判定で決定（例: `/1`, `/2`, または `face` を含むパス）。
2. **来訪フラグ**: `personDetectState.flag`
   - `/api/persondetect` への `direction:"left"` POST により `true` になる時限フラグ。

両条件の AND を `clientSettingsFromServer.facedetection` としてフロントに送り、フロントはそれだけを判断材料にする。

---

## バックエンド実装

### `state/states/personDetectState.ts`

```ts
export const personDetectState: {
  flag: boolean;
  timeoutId: NodeJS.Timeout | null;
} = {
  flag: false,
  timeoutId: null,
};
```

メモリ上のみで永続化はしない（プロセス再起動でリセット）。

### `clientSetting/clientSettingsEmit.ts`

- **`emitClientSettings(id)`**: 単一クライアントへ `clientSettingsFromServer` を送信。
  - ペイロード: `{ facedetection: c.facedetection && personDetectState.flag, hanged: c.hanged }`
- **`broadcastClientSettings()`**: 全クライアントへ `emitClientSettings` を順に呼び出し。
- **`triggerLeftPersonDetect()`**:
  1. 既存の `personDetectState.timeoutId` を `clearTimeout`。
  2. `personDetectState.flag = true`。
  3. `setTimeout(..., 15 * 60 * 1000)` で 15 分後に `flag = false` にし `broadcastClientSettings()`。
  4. `false → true` の遷移時のみ即座に `broadcastClientSettings()`（再 POST が連続した場合の冗長な再送を抑制）。

### `app.ts: POST /api/persondetect`

```ts
if (body.direction === "left") {
  triggerLeftPersonDetect();
  countersRedis.increment("visitor")...
}
```

`direction:"right"` のときは `leave` カウンタの加算のみで、フラグは変更しない。

### `socket/wsServer.ts: connectFromClient`

接続成立時に `connectFromClient` で `clientState.client[id]` を作成した後、`emitClientSettings(id)` を呼んで現在の有効値を送信する。

---

## メッセージプロトコル

### サーバー → クライアント: `clientSettingsFromServer`

```json
{
  "type": "clientSettingsFromServer",
  "data": {
    "facedetection": true,
    "hanged": false
  }
}
```

送信タイミング:

- クライアント接続成立直後（`connectFromClient` 成功時）。
- `personDetectState.flag` が遷移したとき（false→true、true→false いずれも）。

フロントの `socket.ts` ハンドラ:

```ts
socketState.socket.on("clientSettingsFromServer", (data) => {
  if (data?.facedetection) {
    initFaceDetection().catch(...);
  } else {
    stopFaceDetection();
  }
});
```

### クライアント → サーバー: `faceDetectFromClient`

```json
{
  "type": "faceDetectFromClient",
  "data": { "x": 120, "width": 80, "height": 80 }
}
```

`detection.box` の `x / width / height` のみ送信（`y` は送っていない）。

サーバー側 (`wsServer.ts`) の処理:

1. `countersRedis.increment("faceDetect")` でカウンタ加算。
2. `streamsRedis.getLength("PLAYBACK")` を確認。
3. バッファが空なら `"no buffer"` 文字列を該当クライアントへ返して終了。
4. それ以外は `[1, 24]` 時間からランダムに選んだオフセットで過去タイムスタンプを生成し、`streamEmit("PLAYBACK", id, timestamp)` で過去映像を再生。

---

## 来訪フラグのタイマー仕様

```
時刻       イベント                      flag    timeoutId
─────────────────────────────────────────────────────────
T0        POST {direction:"left"}        true    setTimeout(T0+15m)
T0+5m     POST {direction:"left"}        true    clearTimeout → setTimeout(T0+5m+15m)
T0+5m+10m POST {direction:"left"}        true    clearTimeout → setTimeout(T0+5m+10m+15m)
...                                                           (POSTが続けば flag は true のまま)

T0+5m+10m+15m  タイマー満了              false   null
                                         ↓
                                broadcastClientSettings()
                                         ↓
                                 stopFaceDetection()
```

- 15 分以内に再 POST があればタイマーが「最後の POST から 15 分」へリセットされる。
- POST が来ない場合は最後の POST の 15 分後に `false` に戻る。
- プロセス再起動時は `flag = false` で初期化される。

---

## 起動・停止のシナリオ例

### シナリオ A: 初回 POST → 顔認識開始

1. `/api/persondetect {direction:"left"}` 受信
2. `personDetectState.flag` が `false → true`
3. `broadcastClientSettings()` で全クライアントに送信
4. `c.facedetection === true` のクライアントは `initFaceDetection()` を実行
5. `c.facedetection === false` のクライアントは `stopFaceDetection()` を実行（既に停止状態なら no-op）

### シナリオ B: 15 分間 POST が来ず → 顔認識停止

1. タイマー満了で `flag = false`
2. `broadcastClientSettings()` で全クライアントに `facedetection: false` を送信
3. 全クライアントが `stopFaceDetection()` を実行

### シナリオ C: 接続中に POST → 該当クライアントだけ起動

1. `flag === true` の最中にクライアントが新規接続
2. `connectFromClient` 内で `emitClientSettings(id)` が呼ばれ、その時点の有効値が送られる
3. `c.facedetection && flag` が真なら接続直後から顔認識が開始される

---

## 関連ファイル一覧

### バックエンド

- `packages/backend/src/state/states/personDetectState.ts` — フラグ状態
- `packages/backend/src/clientSetting/clientSettingsEmit.ts` — 送信・タイマー制御
- `packages/backend/src/clientSetting/connectFromClient.ts` — 接続時の `client.facedetection` 決定
- `packages/backend/src/socket/wsServer.ts` — 接続時送信、`faceDetectFromClient` 受信処理
- `packages/backend/src/app.ts` — `/api/persondetect` ハンドラ
- `packages/backend/static/models/` — face-api.js モデルファイル

### フロントエンド

- `packages/frontend/src/faceApi/index.ts` — 顔検出ロジック本体
- `packages/frontend/src/socket.ts` — `clientSettingsFromServer` ハンドラ
- `packages/frontend/public/models/` — face-api.js モデルファイル

---

## 既知の挙動・留意点

- `withFaceLandmarks(true).withFaceExpressions()` を呼んでいるが、**表情データは現状未使用**。ランドマークは描画のみ、サーバーへ送るのは bbox の `{x, width, height}` のみ。
- `detection.box.y` は送信していない。縦位置が必要になったら追加する。
- `personDetectState` は永続化しない。サーバー再起動直後は必ず `flag = false`。
- 顔検出のサーバー送信には独立の **30 秒クールダウン** がある（`personDetectState` の 15 分タイマーとは別）。1 回の来訪で連続的に過去映像が再生されるのを防ぐための間引き。
- `initFaceDetection()` は `active` フラグで二重起動を防止しているため、`clientSettingsFromServer` が再送されても安全。
- `stopFaceDetection()` はオーバーレイ DOM とロード済みモデルを保持するため、再起動時のレイテンシは小さい。
