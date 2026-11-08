# CINEMA（HLS 上映）実装ドキュメント

`CINEMA` コマンドで、リポジトリ外 `<repo>/../hls` 配下の HLS タイトルを
ランダムに 1 つ選び、対象端末で上映する機能の説明。

現在の `dev` には初期実装 (`4ae29de`) が入っており、`/project` 音声限定と
専用キャンバス化の改良 (`ddad437`) は `master` / `feat/cinema-canvas` にのみ
存在する（後述「dev と master の差分」）。

---

## 概要

- `CINEMA`（別名 `VIDEO` / `VID` / `MOVIE` / `MOV`）で、`<repo>/../hls` 直下の
  サブフォルダから m3u8 を持つタイトルを 1 つランダムに選び、対象端末へ
  再生 URL を通知する。
- バックエンドが `/hls` で m3u8 / ts を静的配信し、フロントエンドは
  hls.js（Safari は native HLS）でワンショット再生して canvas に描画する。
- 番号指定が無ければ接続中の全ストリーム端末 (`clientState.streamClient`) が対象。

---

## 全体フロー

```
制御端末: "CINEMA" (または 1 CINEMA / VIDEO / MOV ...)
  │ charFromClient → charProcess
  ├ 単体:     execEnter → execCmd("CINEMA")
  └ 番号指定: splitSpace → numTarget → execCmd("CINEMA", target)
  ▼
execCmd.getCmd
  ├ cmd    = { cmd: "CINEMA" }
  └ target = 番号指定 ? [target] : [...clientState.streamClient]
  ▼
execCmd 分岐: CINEMA は cmdEmit ではなく hlsEmit(command.cmd, command.target)
  │
  ├ pickupRandomTitle(): <repo>/../hls/<dir>/*.m3u8 を 1 つランダム選択
  ├ currentState.cmd.CINEMA に target を追加（STOP / PREVIOUS 用の記録）
  └ cinemaEmit({ source, title, url }, id) ── cinemaFromServer ──► 対象端末
                                                                    │ socket.ts
                                                                    ▼ cinemaPlay(data)
                                                              ├ Safari: video.src
                                                              ├ 他: hls.js
                                                              └ drawFrame: canvas へ contain 描画
  STOP / ended ───────────────────────────────────────────────────► cinemaStop()
```

---

## コマンドと対象

| 入力 | 対象 | 経路 |
|---|---|---|
| `CINEMA` / `VIDEO` / `VID` / `MOVIE` / `MOV` | 接続中の全ストリーム端末 | `execEnter` → `execCmd`（target なし） |
| `<index> CINEMA` | 指定端末のみ | `splitSpace` → `numTarget` → `execCmd(cmd, target)` |
| `ALL CINEMA` | `cmdClient` の各端末 | `splitSpace` の ALL 分岐 → 端末ごとに `execCmd` |
| `PREVIOUS` | STOP 直前に CINEMA だった端末 | `previousCmd` → `execCmd(cmd, target)` |

- 別名は `data/list/cmdList.ts` の `CINEMA` / `VIDEO` / `VID` / `MOVIE` / `MOV`。
- CINEMA は `cmdFromServer` を経由しない（`execCmd` が `hlsEmit` に分岐し
  `cmdEmit` を呼ばない）。フロントの `cmdFromServer.ts` に CINEMA ケースはない。
- `<index>` は `numTarget` が `clientState.cmdClient` に含まれる場合のみ実行し、
  含まれなければ `target is not cmd client` を送る。

---

## バックエンド

### `packages/backend/src/app.ts` — `/hls` 静的配信

```ts
app.use("/hls", Express.static(path.join(__dirname, "../../../..", "hls")));
```

- 配信ルートはリポジトリ外の `<repo>/../hls`（例: `/Users/knd/chat/hls`）。
  TLS 鍵と同じくリポジトリ管理外に置く。
- `tsx src/app.ts` 実行時も `dist/app.js` 実行時も同じ場所を指す。

### `packages/backend/src/hls/hlsEmit.ts`

- `HLS_ROOT = path.join(__dirname, "../../../../..", "hls")`
  （`src/hls` / `dist/hls` から 5 階層上が `<repo>/..`）。
- `findPlaylist(dir)`: フォルダ直下の `*.m3u8` を 1 つ返す（無ければ `null`）。
- `pickupRandomTitle()`: `HLS_ROOT` 直下のディレクトリのうち m3u8 を持つものを
  列挙し、`Math.random()` で 1 つ選ぶ。URL は `/hls/<title>/<playlist>`。
- `hlsEmit(cmd, target)`:
  - `target` が空なら何もしない。タイトルが無ければ `console.error` のみ。
  - `currentState.cmd.CINEMA` に target を重複なしで追加する
    （上映端末の記録。タイトルは保持しない）。
  - 各 target へ `cinemaEmit({ source: "CINEMA", title, url }, id)`。

現在の環境では `Kairo` / `TheyLive` / `TheHitchhikersGuideToTheGalaxy` に
`output.m3u8` があり候補になる（`HereAndThere` と `JohnCage.mp4` は候補外）。

### `packages/backend/src/socket/ioEmit.ts`

- `cinemaEmit(data, target?)`: `cinemaFromServer` を送る
  （`target` 未指定なら全端末、指定時は `io.to(target)`）。

### 状態

- `currentState` / `previousState` に `CINEMA: string[]` を追加
  （`state/states/*.ts`, `types/stateType.d.ts`）。
- `execStop` の汎用ループが `currentState.cmd` を全クリアして
  `previousState.cmd` へ退避するため、STOP 後の `PREVIOUS` で CINEMA が
  再上映される（タイトルは再抽選）。
- `INIT REDIS`（`initRedis()`）で `currentState.cmd.CINEMA = []`。

---

## フロントエンド

### HTML

`html/index.html` / `html/snowleopard.html` に
`<video id="cinemaVideo" style="display: none" playsinline>` を追加。
デコード専用で、表示は canvas 描画で行う。

### `packages/frontend/src/hls/cinemaPlayer.ts`（dev 版）

- モジュールスコープに `hls` / `video` / `rafId` / `onEnded` を保持する
  （同時上映は端末ごとに 1 本）。
- `cinemaPlay(data)`:
  1. `cinemaStop()` で前回の再生を停止。
  2. `#cinemaVideo` を取得（無ければ error）。
  3. `loop = false`（ワンショット）、`muted = false` に戻す。
  4. `video.canPlayType("application/vnd.apple.mpegurl")` なら `video.src`
     （Safari native）、`Hls.isSupported()` なら hls.js
     （`loadSource` + `attachMedia`）、どちらも不可なら error。
  5. `ended`（once）で `cinemaStop()`。
  6. `video.play()` が自動再生ブロックで失敗したら `muted = true` で再試行。
  7. `requestAnimationFrame(drawFrame)` を開始。
- `drawFrame()`:
  - `readyState < 2` または映像サイズ 0 の間はスキップ。
  - 毎フレーム `erasePrint()`（`#cnvs` 全消去）してから、ウィンドウに対する
    contain 中央配置で `canvasElement.ctx`（= `#cnvs`）へ `drawImage`。
- `cinemaStop()`: RAF 停止 → `hls.destroy()` → `ended` 解除 →
  `video.pause()` + `src` 除去 + `load()` → `erasePrint()`。

### `packages/frontend/src/socket.ts`

- `cinemaFromServer` 受信で `cinemaPlay(data)`。
- `stopFromServer` 受信で `cinemaStop()`（STOP / Escape で上映停止）。

---

## dev と master の差分（未マージ）

`ddad437`（feat/cinema-canvas, PR #44）は `origin/master` に入っているが
`dev` には未マージ。dev の CINEMA は初期実装 (`4ae29de`) のまま。

| 項目 | dev（現作業ツリー） | master / feat/cinema-canvas |
|---|---|---|
| 音声 | 対象端末すべてで再生 | `urlPathName` に `project` を含む端末が接続されていれば `/project` 端末のみ音声、他はミュート。無ければ全端末 |
| 描画先 | `#cnvs`（`canvasElement.ctx`） | 背面の `#cinemaCnvs`（`#cnvs` の文字・画像を映像の手前に残す） |
| ペイロード | `{ source, title, url }` | `{ source, title, url, audio: boolean }` |
| 追加ファイル | — | `backend/src/hls/cinemaAudio.ts` / `backend/test/hls/cinemaAudio.test.ts` |
| 主な変更 | — | `hlsEmit.ts` / `ioEmit.ts` / `cinemaPlayer.ts` / `socket.ts` / `canvasSizing.ts` / HTML / `client.css` |
| 削除 | — | 未参照だった `packages/frontend/src/client.css` |

### master 側の実装ポイント

- `cinemaAudio(clients, target)`: 接続中に `/project` が 1 台でもいれば
  `/project` のみ `true`、いなければ全 target が `true`。
  返り値 `{ [id]: boolean }` を `cinemaEmit` の `audio` に載せる。
- `cinemaPlayer` は `video.muted = !data.audio` とし、`#cinemaCnvs` を
  毎フレーム `clearRect` → `drawImage`。`cinemaStop` でクリアする。
- `canvasSizing` が `#cinemaCnvs` もウィンドウサイズにリサイズ。
  CSS は `#cinemaCnvs { position: absolute; z-index: 1; }`
  （`#cnvs` は z-index 2）。
- `test/hls/cinemaAudio.test.ts`: `/project` あり / なし、対象外端末、
  接続情報なしの 4 ケース。

---

## 検証

- 型チェック:
  - `pnpm -F backend exec tsc --noEmit`
  - `pnpm -F frontend exec tsc --noEmit`
- テスト: dev に CINEMA 用テストは無い。master 側は
  `packages/backend/test/hls/cinemaAudio.test.ts`
  （`pnpm -F backend exec vitest run test/hls/cinemaAudio.test.ts`）。
- 手動確認:
  - `<repo>/../hls/<title>/` に m3u8 + ts を置く
    （現在は Kairo / TheyLive / TheHitchhikersGuideToTheGalaxy）。
  - 対象端末（`/1` など）から `CINEMA` または `1 CINEMA` を実行 → 上映、
    `STOP` / Escape で停止。
  - `INIT REDIS` 後は `currentState.cmd.CINEMA` が空になる。

---

## 制約・既知の制限

- HLS の実体はリポジトリ外 `<repo>/../hls` 固定。無い場合はエラーログのみで
  何も起きない。
- タイトルは毎回ランダム。同じタイトルを指定して再生する手段はない
  （`currentState.cmd.CINEMA` は端末リストのみ保持）。
- 同時上映は端末ごとに 1 本（`cinemaPlay` が前回を停止する）。タイトルは
  全端末で同一。
- dev 版は `#cnvs` を毎フレーム全消去するため、上映中はテキスト等の描画が
  消える（master 版は `#cinemaCnvs` 分離で解消）。
- 自動再生ブロック時はミュートで再試行するため、音声が出ない場合がある
  （dev 版）。
- Vite dev サーバーは `/hls` を proxy しない（proxy は `/socket.io` のみ）。
  通常は backend（:8888）が static と `/hls` を同一オリジン配信する構成で使う。
- `hls.js` は frontend の依存（`hls.js@1.5.8`）。Safari は native HLS を使う。

---

## 関連ファイル

| ファイル | 役割 |
|---|---|
| `packages/backend/src/app.ts` | `/hls` 静的配信（リポジトリ外 `<repo>/../hls`） |
| `packages/backend/src/hls/hlsEmit.ts` | タイトル抽選・`cinemaEmit`・`currentState.cmd.CINEMA` 更新 |
| `packages/backend/src/socket/ioEmit.ts` | `cinemaEmit`（`cinemaFromServer`） |
| `packages/backend/src/cmd/execCmd.ts` | CINEMA 分岐（`hlsEmit`）と target 決定 |
| `packages/backend/src/cmd/execEnter.ts` / `splitSpace/numTarget.ts` | 単体 / 番号指定の入口 |
| `packages/backend/src/state/states/currentState.ts` / `previousState.ts` | `cmd.CINEMA` |
| `packages/backend/src/redis/initRedis.ts` | `INIT REDIS` 時の CINEMA クリア |
| `types/stateType.d.ts` | `CINEMA: Array<string>` |
| `packages/frontend/html/index.html` / `snowleopard.html` | `#cinemaVideo` |
| `packages/frontend/src/hls/cinemaPlayer.ts` | HLS 再生・canvas 描画・停止 |
| `packages/frontend/src/socket.ts` | `cinemaFromServer` / `stopFromServer` |
| `packages/backend/src/hls/cinemaAudio.ts` ※master のみ | `/project` 音声担当の決定 |
| `packages/backend/test/hls/cinemaAudio.test.ts` ※master のみ | `cinemaAudio` の単体テスト |
