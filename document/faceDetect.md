# 顔認識（face-api.js）実装ドキュメント

`face-api.js` を用いたフロント側のリアルタイム顔検出・正面判定と、それを通知として受け取るバックエンドのシナリオ再生（`faceDetectScenario`）の実装説明。

- 顔検出はクライアント（ブラウザ）側で実行する。**個人識別は行わず**、顔の有無と向き（正面度）だけを扱う。
- 正面判定が `FRONTAL_CONFIRM_MS = 200ms` 継続した時点でサーバーへ通知し、サーバーは録画済みの過去映像（PLAYBACK）を再生するシナリオを走らせる。

---

## 全体アーキテクチャ

```
【バックエンド】                                【フロントエンド】

connectFromClient 成功
  └─ emitClientSettings(id) ───────────────> socket.ts
        clientSettingsFromServer                │
        { facedetection, hanged }               ├─ facedetection true  → initFaceDetection()
                                                └─ facedetection false → stopFaceDetection()
                                                        │
                                                        ▼
                                                 face-api.js 検出ループ（250ms 間隔）
                                                        │
                                          正面判定が 200ms 継続（frontalSince）
                                                        │
                                                        ▼ emit + 1フレーム表示 + 90秒点滅無効
faceDetectFromClient <──────────────────────────────────┘
  { x, width, height }
  │
  ├─ countersRedis.increment("faceDetect")
  │
  ▼
faceDetectScenario(id)
  ├─ 全ストリーム停止（execStop）
  ├─ CHAT 開始（検出端末へ chatReqEmit）
  ├─ recordEmit(id, false)          … 検出端末に録画リクエスト
  ├─ playFirstBuffer（recent）      … 検出端末で過去映像を再生
  ├─ 15秒後 playRestBuffers（today / yesterday）
  └─ 40秒後 stopStream（全ストリーム停止）
```

---

## モデルファイル

`packages/frontend/public/models/` に配置し、ビルド時に `packages/backend/static/models/` へコピーされる（static 側も git 管理されている）。

- `tiny_face_detector_model-*` — 顔検出
- `face_landmark_68_tiny_model-*` — 68点ランドマーク
- `face_expression_model-*` — 表情認識（**現状ロード・推論のみで結果は未使用**）

URI は `MODEL_URL = "/models"`。Express の static 配信から取得する。

---

## フロントエンド実装

### `packages/frontend/src/faceApi/index.ts`

#### 定数

| 定数 | 値 | 意味 |
| --- | --- | --- |
| `MODEL_URL` | `/models` | モデル配信パス |
| `FRONTAL_RATIO` | `0.4` | 顔の向きの許容範囲（正面±40%） |
| `FRONTAL_CONFIRM_MS` | `200` | 正面判定の継続確認時間 |
| `DETECT_INTERVAL_MS` | `250` | 検出ループ間隔 |
| `FLASH_DISABLE_MS` | `90 * 1000` | 認識成立後に点滅を無効化する時間 |
| `SNAPSHOT_DURATION_MS` | `1000` | スナップショットの表示時間 |

#### モジュール状態

```ts
let overlayCanvas: HTMLCanvasElement | null = null;
let active = false;
let modelsLoaded = false;
let wasFrontal = false;        // 正面継続を確定済みか
let frontalSince: number | null = null; // 正面と判定され始めた時刻

let flashOverlay: HTMLDivElement | null = null;
let flashTimer: ReturnType<typeof setInterval> | null = null;
let flashWhite = false;
let flashDisabledUntil = 0;

let snapshotOverlay: HTMLCanvasElement | null = null;
let snapshotTimer: ReturnType<typeof setTimeout> | null = null;

let faceDetectBlockedUntil = 0;
```

#### `initFaceDetection()`

1. `active === true` なら早期 return（二重起動ガード）。
2. 初回のみ 3 つのモデルを `Promise.all` で並列ロードし、`modelsLoaded = true`。
3. `<canvas id="faceCanvas">` を生成し `#wrapper` に追加（`position:absolute; z-index:3; pointer-events:none`）。
4. `active = true` にし、`detectLoop()` を開始。

#### `detectLoop()`

`setTimeout(detectLoop, DETECT_INTERVAL_MS)` による 250ms 間隔の疑似ループ。

1. **ブロック中**: `Date.now() < faceDetectBlockedUntil` の間は推論（`detectAllFaces`）も emit も行わず、キャンバスをクリアして点滅を止め、次のループへ。
2. `video.readyState >= 2 && video.videoWidth > 0` のとき検出を実行:

   ```ts
   faceapi
     .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
     .withFaceLandmarks(true)
     .withFaceExpressions();
   ```

3. 結果を `window.innerWidth / innerHeight` にリサイズし、キャンバスをクリア。
4. 顔が 1 つ以上あれば `drawFaceLandmarks` で描画し、**先頭の顔 `resized[0]` のみ**を判定に使う。

#### 正面判定

```ts
const leftJaw = positions[0];   // 左の顎
const rightJaw = positions[16]; // 右の顎
const noseTip = positions[30];  // 鼻先
const faceCenterX = (leftJaw.x + rightJaw.x) / 2;
const halfFaceWidth = (rightJaw.x - leftJaw.x) / 2;
const frontalOffset = (noseTip.x - faceCenterX) / halfFaceWidth; // 中央=0、真横=±1
```

`Math.abs(frontalOffset) <= FRONTAL_RATIO (0.4)` なら正面とみなす。

#### ブランチごとの処理

- **正面**:
  - `wasFrontal === false` のとき、`frontalSince` が未設定なら現在時刻を記録するだけ（確定はまだしない）。
  - すでに `frontalSince` があり、`Date.now() - frontalSince >= FRONTAL_CONFIRM_MS` なら**認識成立**:
    1. `faceDetectFromClient` を `{x, width, height}` で送信（`detection.box` の値。`y` は送らない）
    2. `showCapturedFrame()` でカメラ映像を1フレームだけ全画面に1秒間表示
    3. `flashDisabledUntil = now + FLASH_DISABLE_MS`（90秒間点滅を無効化）
    4. `wasFrontal = true`
  - 正面である限り `stopFlashing()`。
- **正面から外れている**: `wasFrontal = false`、`frontalSince = null` にして `startFlashing()`。
- **顔がない**: `wasFrontal = false`、`frontalSince = null`、`stopFlashing()`。
- **映像が未準備**: `stopFlashing()` のみ。

正面が `FRONTAL_CONFIRM_MS` 未満で途切れた場合（横を向いた・顔が消えた）は `frontalSince` が破棄され、認識成立しない。

#### 点滅オーバーレイ (`#faceFlash`)

- 正面から外れている間、`position:fixed; inset:0; z-index:9999; pointer-events:none` の div を
  500ms ごとに白⇔黒へ切り替えて点滅させる（1秒で1周期）。
- `flashDisabledUntil` 中は `startFlashing()` が早期 return する（認識成立後の 90秒間）。
- `stopFlashing()` はタイマー停止 + 非表示。

#### スナップショット (`#faceSnapshot`)

- 認識成立の瞬間に `video` の1フレームを `drawImage` で canvas に取り込み、全画面表示する。
- アスペクト比を保って contain 配置、背景は黒。`SNAPSHOT_DURATION_MS = 1000ms` 後に非表示。
- `hideCapturedFrame()` はタイマーと表示をクリアする。

#### `blockFaceDetection(durationMs)`

- `faceDetectBlockedUntil = Date.now() + durationMs` を設定し、その間は検出・emit を停止する。
- 呼び出し元は `socket.ts` の `faceDetectBlockFromServer` ハンドラだが、**サーバー側の emit は現在コメントアウトされている**ため実際には発火しない（後述）。

#### `stopFaceDetection()`

- `active = false`、`wasFrontal = false`、`frontalSince = null` にしてループを終了させる。
- 点滅・スナップショットを停止し、`overlayCanvas` をクリア。
- モデルと DOM 要素は再起動高速化のため保持する。

---

## 起動条件

`connectFromClient` で決まる `clientState.client[id].facedetection` のみで決まる
（旧実装の `personDetectState.flag` との AND は廃止済み）。

| URL パス | `facedetection` | 備考 |
| --- | --- | --- |
| `/1` `/2` `/3` | `false` | 以前は `/1`,`/2` で有効化していたが、`connectFromClient.ts` でコメントアウト済み |
| `face` を含むパス（例: `/face`） | `true` | `data.urlPathName.includes("face")` |
| `noStream`（clientMode） | `false` | |
| その他の client | `false` | |

- `app.ts` の `app.get("/:name")` が index.html を返すため、`/face` でアクセスした端末は自動的に顔認識対象になる。
- 接続成立直後に `emitClientSettings(id)` が現在値を送信し、フロントの `clientSettingsFromServer` ハンドラが
  `initFaceDetection()` / `stopFaceDetection()` を切り替える。

---

## バックエンド実装

### `clientSetting/clientSettingsEmit.ts`

- **`buildPayload(id)`**: `{ facedetection: c.facedetection, hanged: c.hanged }` を返す（クライアント未登録なら `null`）。
- **`emitClientSettings(id)`**: 単一クライアントへ `clientSettingsFromServer` を送信。
- **`broadcastClientSettings()`**: 全クライアントへ送信するが、**現在呼び出し元はない**（接続時送信のみ）。

### `socket/wsServer.ts`

- `connectFromClient` 成功時に `emitClientSettings(id)` を呼ぶ。
- `faceDetectFromClient` 受信時:
  1. `countersRedis.increment("faceDetect")` でカウンタ加算（ログ出力のみ）
  2. `await faceDetectScenario(id)` を実行

### `scenario/faceDetectScenario.ts`

`faceDetectScenario(detectedClientId)` の処理フロー:

1. `execStop(pickClientId() ?? "all")` で再生中ストリーム・コマンドを全停止。
2. CHAT を開始。`detectedClientId` があればその端末に `chatReqEmit(id)`、なければ全体へ。`streamState.target.CHAT` は 5秒後に全クライアントへ戻す。
3. `recordEmit(detectedClientId, false)` で検出端末に録画リクエスト（PLAYBACK / `recordIndex` 採番 / timeout 10秒）。`currentState.RECORD` ガードはコメントアウトされており、毎回実行される。
4. M5 の `rotation` を `m5Test` → `blinkM5Switch("rotation", state, 50, 16)` で点滅させ、60秒後に `m5Switch("rotation", false)` で停止。
5. `faceDetectScenario.json` のステップを実行:
   - `delayMs: 0` — `playFirstBuffer`: 最新 (recent) の PLAYBACK バッファを**検出端末で**再生。
   - `delayMs: 15000` — `playRestBuffers`: today / yesterday の候補をランダムな端末で再生。
6. 40秒後に `stopStream()` で全ストリームを停止。

バッファ候補の決定（`PLAYBACK` の `recordIndex` エントリを参照）:

- **recent**: 最大 `recordIndex` のエントリ。`playFirstBuffer` の対象。
- **today**: 本日0時以降かつ recent 以外のエントリのうち、1時間前に最も近いもの。
- **yesterday**: `itsukiState.faceDetect.yesterdayLoaded` が `true` のときのみ。`scenarioItsuki` の更新処理がコメントアウトされているため**現状は常に `false`**。

その他の状態:

- `availableBuffersState` は候補の有無を書き込むが、**読み取り元がなく未使用**。
- シナリオ実行時間（最大 `delayMs` = 15秒）+ `FACE_DETECT_BLOCK_AFTER_MS` (20秒) = 35秒を
  `faceDetectBlockFromServer` で通知する行は**コメントアウト中**（復活させるとフロント側の `blockFaceDetection` が機能する）。

### `scenario/faceDetectScenario.json`

```json
{
  "steps": [
    { "delayMs": 0,     "actions": [{ "type": "playFirstBuffer" }] },
    { "delayMs": 15000, "actions": [{ "type": "playRestBuffers" }] }
  ]
}
```

---

## メッセージプロトコル

### サーバー → クライアント: `clientSettingsFromServer`

```json
{
  "type": "clientSettingsFromServer",
  "data": { "facedetection": true, "hanged": false }
}
```

送信タイミング: クライアント接続成立直後（`connectFromClient` 成功時）。

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

- 正面が 200ms 継続して認識成立した瞬間にのみ送信（`detection.box` の `{x, width, height}`。`y` は未送信）。
- サーバーはカウンタ加算の後、`faceDetectScenario(id)` を実行する。

### サーバー → クライアント: `faceDetectBlockFromServer`（現状未使用）

```json
{
  "type": "faceDetectBlockFromServer",
  "data": { "durationMs": 35000 }
}
```

- フロントに `blockFaceDetection(durationMs)` を呼ぶハンドラは存在するが、サーバー側の emit がコメントアウトされているため現状は送信されない。

---

## 挙動タイムライン（認識成立時）

```
T=0.00s   正面に入る（frontalSince 記録、点滅停止。emit はまだしない）
T≈0.25s   次の検出でも正面 → 認識成立
          - faceDetectFromClient 送信
          - カメラ1フレームを1秒間表示
          - 90秒間は点滅を無効化
T≈0.25s   サーバー: faceDetect カウンタ加算 → faceDetectScenario
          - 全停止 → CHAT 開始 → 録画リクエスト
          - recent バッファを検出端末で再生
          - M5 rotation 点滅開始
T≈15.25s  playRestBuffers（today / yesterday）
T≈40.25s  stopStream（全ストリーム停止）
T≈60.25s  M5 rotation 停止
```

---

## 既知の挙動・留意点

- **確定タイミング**: 検出ループが 250ms 間隔のため、確認は「正面判定開始から 200ms 以上経過した最初の検出サイクル」で行われる。公称では正面判定開始の 250ms 後（推論時間分の遅延あり）に成立し、実際に正面を向いてからは最大で約 0.5秒かかる。
- **表情データは未使用**: `withFaceExpressions()` を呼ぶが結果は使っていない。ランドマークも描画のみ。
- **`detection.box.y` は未送信**: 縦位置が必要になったら追加する。
- **ブロック通知は無効**: サーバー側 emit がコメントアウトのため `blockFaceDetection` は現状到達しないコード。
- **`yesterdayLoaded` は常に false**: `scenarioItsuki` の更新処理がコメントアウトされており、yesterday 再生は現状到達しない。
- **`availableBuffersState` は未使用**: 書き込みのみで読み取り元がない。
- **`/1`・`/2` では顔認識が無効**: `connectFromClient.ts` の該当行をコメントアウト解除すれば有効化できる。
- **複数顔は先頭のみ**: `resized[0]` だけを使う。
- **録画ガードなし**: `recordEmit` の `currentState.RECORD` ガードはコメントアウトされており、認識のたびに録画リクエストが飛ぶ。
- **テストなし**: `clientSetting` 系のテストのみで、`faceApi` / `faceDetectScenario` の自動テストはない。

---

## 旧仕様からの変更点（このドキュメントの更新内容）

- 旧・来訪フラグ方式（`personDetectState` の 15分タイマー、`POST /api/persondetect`、`personDetectState.flag` との AND）は廃止。`app.ts` のハンドラはコメントアウトで残置。
- 送信間引きは 30秒クールダウン方式から「正面 200ms 継続の確認 + 認識後の90秒点滅無効（+ 将来の `faceDetectBlockFromServer`）」に変更。
- 検出ループは 100ms → 250ms に間引き。
- 認識時のサーバー処理は「ランダムな過去タイムスタンプの PLAYBACK 再生」から「`faceDetectScenario` による録画 + recent/today/yesterday 再生」に変更。

---

## 関連ファイル一覧

### バックエンド

- `packages/backend/src/clientSetting/connectFromClient.ts` — 接続時の `client.facedetection` 決定
- `packages/backend/src/clientSetting/clientSettingsEmit.ts` — `clientSettingsFromServer` の送信
- `packages/backend/src/socket/wsServer.ts` — 接続時送信、`faceDetectFromClient` 受信処理
- `packages/backend/src/scenario/faceDetectScenario.ts` — 認識後のシナリオ実行
- `packages/backend/src/scenario/faceDetectScenario.json` — シナリオ定義（ステップ）
- `packages/backend/src/state/states/itsukiState.ts` — `faceDetect.yesterdayLoaded` 保持
- `packages/backend/static/models/` — face-api.js モデルファイル

### フロントエンド

- `packages/frontend/src/faceApi/index.ts` — 顔検出・正面判定・点滅・スナップショットの実装本体
- `packages/frontend/src/socket.ts` — `clientSettingsFromServer` / `faceDetectBlockFromServer` ハンドラ
- `packages/frontend/public/models/` — face-api.js モデルファイル
