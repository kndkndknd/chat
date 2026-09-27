# TILE モード実装ドキュメント

投影用クライアント (`/project`) に、映像ソースごとの「タイル」をランダムな
サイズ・位置で重ねて表示するモード。従来の 1 枚 canvas 最大化表示を置き換える。

---

## 概要

- 通常時: `#cnvs` に届いた映像をウィンドウいっぱいに最大化描画する。
- TILE モード時: 映像ソースごとに矩形（タイル）を割り当て、複数タイルを
  同時に投影先へ合成描画する。サイズ・位置は乱数で決まり、重なりを許容する。
- 対象はサーバコマンドで切り替える。投影先は `/project` で接続した
  クライアント (`clientState.client[id].projection === true`) のみ。
- 旧 `floating`（送信元 position で投影先に重ねる機能）は本モードへ統合した。

### 用語

| 用語 | 意味 |
|---|---|
| ソース | ストリーム種別。`CHAT` / `PLAYBACK` / `TIMELAPSE` / `EMPTY` / 任意の named stream |
| 発信元 (origin) | その映像フレームを送信したクライアント。CHAT は `from`、named stream は `id` に格納される |
| タイル | ソース（＋発信元）に対応する表示矩形。オフスクリーン canvas と矩形情報を保持する |
| 投影先 (projection) | `/project` で接続した表示専用クライアント |

---

## 全体アーキテクチャ

```
【送出側クライアント】                     【バックエンド】                        【投影先 (/project)】
 映像フレーム (base64)                     
   │ chatFromClient / workletBufferFromClient              
   ▼                                       
 chatReceive / execStream                  
   │  chunk = { source, video, audio, from|id, ... }        
   │                                       
   ├─ ioEmitChatFromServer / ioEmitStreamFromServer        
   │     │ streamState.tile || streamState.floating ?       
   │     │                                                  
   │     ├─ 宛先が投影先以外:                                
   │     │    streamEmit(stream, targetId)  ── 通常端末（音声も再生）
   │     │    streamEmit({...stream, ...tileMeta, mirror}, projectionId)
   │     │                                      └──────────► chatFromServer / streamFromServer
   │     │                                                    └─ drawTile()（映像のみ）
   │     └─ 宛先が投影先自身:                                
   │          streamEmit({...stream, ...tileMeta, request}, projectionId)
   │                                            └──────────► drawTile() + playAudioStream()
   │                                                          + streamReq()（次フレーム要求）
   └─ tileLayout.tilePosition(key)  ── キー単位で矩形を決定・保持
```

---

## タイルの決定（バックエンド）

### `packages/backend/src/clientSetting/tileLayout.ts`

タイル台帳（モジュールスコープのオブジェクト）を保持する。

- `tileKey(source, originId?)`
  - `originId` があれば `` `${source}:${originId}` ``、無ければ `source`。
  - CHAT は `from`、named stream は `id` を発信元として渡す。
  - `PLAYBACK` / `TIMELAPSE` / `EMPTY` は発信元が保存されていないため
    **ソース単位の 1 タイル**になる。
- `tilePosition(key)`
  - 既存キーなら台帳の矩形を再利用する（既存枠の再利用）。
  - 未登録なら `basePosition()`（投影先の画面サイズ。未接続時は 1920x1080）を
    基準に乱数で矩形を生成し、台帳へ保存する。
  - 幅は画面幅の 1/4〜3/4、高さは画面アスペクト比から算出、位置は画面内で乱数。
    重なりは許容する。
- `tileMeta(source, originId)`
  - 送出チャンクへ付与する `{ tile: true, key, position }` を返す。
- `clearTiles()`
  - 台帳を全消去する（`TILE CLEAR` / `TILE` OFF 時）。

---

## サーバ送出フロー

### 非 CHAT ストリーム: `packages/backend/src/stream/execStream.ts`

`ioEmitStreamFromServer(stream, targetId, source)` が送出を担う。

```ts
const tileEnabled = streamState.tile || streamState.floating;
const projectionId = projectionTargetId(); // 最初の projection クライアント

if (tileEnabled && projectionId !== undefined) {
  const meta = tileMeta(source, stream.from ?? stream.id);
  if (targetId === projectionId) {
    // 投影先自身が宛先: タイル + 音声 + 次フレーム要求
    streamEmit({ ...stream, ...meta, request: true }, targetId);
  } else {
    // 通常端末が宛先: 通常端末は通常どおり（音声も担当）
    streamEmit(stream, targetId);
    // 投影先へは映像のみのミラー
    streamEmit({ ...stream, ...meta, mirror: true }, projectionId);
  }
  return;
}
streamEmit(stream, targetId);
```

`paStreamEmit` も同じ `ioEmitStreamFromServer` を通るため同様にタイル化される。

### CHAT: `packages/backend/src/stream/chatReceive.ts`

`execChat` から `ioEmitChatFromServer(chunk, targetId)` を呼ぶ。
（同関数はリファクタ commit `ed9522a` で孤立していたものを本実装で結線し直した。）

- `chunk.from` が発信元。`tileMeta("CHAT", chunk.from ?? chunk.id)`。
- それ以外は非 CHAT と同じ `request` / `mirror` の振り分け。
- 既存の `pi` 端末向け `switchCramp("CHAT")` もこの関数内で実行される。

---

## クライアント描画（投影先）

### `packages/frontend/src/canvasEvent/tile.ts`

タイルごとにオフスクリーン canvas を持ち、メイン canvas へ合成する（案A）。

- `drawTile(video, position, key)`
  - `key` 単位でオフスクリーン canvas を用意・再利用する。
  - 映像はタイル矩形にアスペクト比を保って contain 配置する。
  - 更新のたびに `updatedAt` を更新し、合成を `requestAnimationFrame` で予約する。
- `composite()`
  - `updatedAt` の昇順（古い→新しい = **最新が前面**）で全タイルを
    `#cnvs` へ描画する。重なりはこの描画順で表現される。
  - 合成時にメイン canvas を全消去するため、通常の `showImage` の
    全消去モデルとは独立して動く。
- `clearTiles()`
  - 台帳とメイン canvas を消去する。
- タイルは明示的に消去されるまで保持される（**枠を保持**、最後のフレームで凍結）。
  タイル映像の到着が止まっても他タイルの更新時に再合成され続ける。

### `packages/frontend/src/socket.ts`

`chatFromServer` / `streamFromServer` の受信で `data.tile` を判定する。

```ts
if (data.tile) {
  if (!data.mirror) {
    playAudioStream(...);      // ミラー時は音声を鳴らさない
  }
  if (data.video && data.position && data.key) {
    drawTile(data.video, data.position, data.key);
  }
  if (data.request) {
    streamReq(...);            // 投影先が宛先のときだけ次フレームを要求
  }
  return;                      // 通常の showImage / quantize 経路へは流さない
}
```

`tileClearFromServer` 受信で `clearTiles()` を呼ぶ。

---

## チャンクに付与されるフィールド

| フィールド | 型 | 意味 |
|---|---|---|
| `tile` | boolean | このフレームはタイルとして描画する |
| `key` | string | タイルキー (`source` または `source:origin`) |
| `position` | `{top,left,width,height}` | タイル矩形（投影先画面座標） |
| `request` | boolean | 受信側で次フレームを要求する（投影先が宛先のとき） |
| `mirror` | boolean | 映像のみのミラー（音声は通常端末が担当） |

---

## コマンド

| 入力 | 動作 | 実装 |
|---|---|---|
| `TILE` | TILE モードをトグル。OFF 時は台帳をクリアし投影先へ消去を通知 | `cmd/receiveEnter.ts` |
| `TILE CLEAR` | タイル台帳を破棄し、投影先の全タイルを消去（モードは変更しない） | `cmd/splitSpace/index.ts` |

投影先への消去通知は `tileClearEmit()`（`socket/ioEmit.ts`）→
`tileClearFromServer` イベント。

`streamState.tile` は Redis に永続化されるため、再起動後も状態が残る。

---

## 音声の扱い

- 宛先が**通常端末**のとき: 通常端末のみ音声再生。投影先へ送るタイルは
  映像のみ（`mirror: true`）。
- 宛先が**投影先自身**のとき: 投影先で音声再生し、次フレームを要求する。

---

## floating の統合

`streamState.floating`（`FLOATING` コマンド）は従来、非投影先の送信元映像を
その送信元 position で投影先に重ねる機能だった。本実装では送出分岐を
`streamState.tile || streamState.floating` の単一経路にまとめ、
どちらのフラグでもタイルとして描画するようにした。

---

## 検証

- 型チェック: `pnpm -F backend exec tsc --noEmit` / `pnpm -F frontend exec tsc --noEmit`
- テスト:
  - `packages/backend/test/clientSetting/tileLayout.test.ts`
    - `tileKey` の導出、乱数矩形の計算、既存枠の再利用、`clearTiles` 後の再生成、
      `tileMeta` の内容を検証。
  - `pnpm -F backend exec vitest run` / `pnpm -F frontend exec vitest run`

---

## 制約・既知の制限

- 投影先は `Object.keys(...).find(...)` で最初の 1 台のみ対象（既存 floating と同じ）。
- `PLAYBACK` / `TIMELAPSE` / `EMPTY` は発信元を保持しないためソース単位の 1 タイル。
- タイル化されたフレームは quantize 経路を経由せず即時再生する。
- ウィンドウリサイズで `#cnvs` がリサイズされると次フレーム到着までタイルが消える
  （`canvasSizing` 準拠）。
- タイル矩形は接続時の投影先サイズ基準の絶対座標で、リサイズには追随しない。
- メイン canvas を共有するため、タイル表示中に `textPrint` 等の全消去を伴う
  描画が走ると一時的にタイルが消える。

---

## 関連ファイル

| ファイル | 役割 |
|---|---|
| `packages/backend/src/clientSetting/tileLayout.ts` | タイル台帳・矩形決定・メタ生成 |
| `packages/backend/src/stream/execStream.ts` | 非 CHAT のタイル送出 |
| `packages/backend/src/stream/chatReceive.ts` | CHAT のタイル送出 |
| `packages/backend/src/cmd/receiveEnter.ts` | `TILE` コマンド |
| `packages/backend/src/cmd/splitSpace/index.ts` | `TILE CLEAR` コマンド |
| `packages/backend/src/socket/ioEmit.ts` | `tileClearEmit` |
| `packages/backend/src/state/states/streamState.ts` | `tile` フラグ |
| `types/stateType.d.ts` | `streamStateType.tile` |
| `packages/frontend/src/canvasEvent/tile.ts` | タイル合成描画 |
| `packages/frontend/src/canvasEvent/index.ts` | `drawTile` / `clearTiles` の export |
| `packages/frontend/src/socket.ts` | タイルフレーム受信・音声・再要求 |
| `packages/backend/test/clientSetting/tileLayout.test.ts` | タイルレイアウトの単体テスト |
