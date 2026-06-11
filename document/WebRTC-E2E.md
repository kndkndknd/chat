# WebRTC E2E 検証手順 (フロントエンド移行版)

> 対象: WebRTC ピアを backend werift から `/webrtc` ブラウザ (SyncClient) へ移行した構成。
> 関連実装: `packages/frontend/src/webRTC/syncClient.ts` / `syncConfig.ts`、`main.ts` の `/webrtc` 起動分岐。
>
> ⚠️ `document/WebRTC.md` は **旧 werift 構成**の記述で、本移行後は内容が古い（ffmpeg/werift/MSE
> リレーは撤去済み）。アーキテクチャの正本は順次こちらへ移行する。

## 0. この E2E で確認すること

| レイヤ | 確認内容 |
|---|---|
| シグナリング | `/webrtc` が chat_sync `/ws` に直接 join し、`itsuki-` ピアとして在席する。役割が peer-joined(offerer)/peer-ready(answerer) に割り当たり、offer/answer/ICE がリレーされる |
| 入室ゲート | itsuki 在席で一般 visitor が入室可。itsuki 不在だと `not-available`、営業時間外だと `closed`（visitor のみ。itsuki はバイパス） |
| メディア | 双方向の映像・音声が P2P (host/srflx/relay) で流れ、`framesDecoded` が増加する |
| 自動運用 | ロードで自動接続、WS 切断 / peer-left で自動再接続・再 join |
| 撤去確認 | backend が ffmpeg を spawn しない。他パス (`/`,`/pi`,`/counter`) は従来動作で WebRTC を起動しない |

---

## 1. 前提・設定

- `/webrtc` 端末: Windows + Google Chrome（本番は Alder Lake-N100）。
- secure context が必須（getUserMedia）。`https://...` か `http://localhost` で配信する。
- 接続先 chat_sync URL は `VITE_CHAT_SYNC_URL` で切替（`packages/frontend/.env.example` 参照）。**ビルド時**に焼き込まれる。
- chat_sync 側の `itsuki-` プレフィックス・営業時間・room 上限 2 はそのまま（無改変）。

```bash
# 本番向けビルド（既定 wss://chat.knd.cloud/ws）
pnpm -C packages/frontend build

# ローカル chat_sync 向けビルド
VITE_CHAT_SYNC_URL="ws://localhost:3000/ws" pnpm -C packages/frontend build
```

ビルド成果物は `packages/backend/static/` に出力され、backend が配信する。`/webrtc` は
`app.get("/:name")` フォールバックで `index.html`（=`main.js`）を返し、`main.ts` が
`location.pathname.includes("webrtc")` で SyncClient を起動する。

---

## 2. Path A: 本番構成での E2E（推奨・実運用）

1. N100 Chrome のサイト設定で、chat_itsuki オリジンの**カメラ/マイクを「許可」に固定**（無人自動起動の前提）。必要なら autoplay 許容（キオスク起動フラグ `--autoplay-policy=no-user-gesture-required` 等）。
2. N100 Chrome で `https://<chat_itsuki>/webrtc` を開く。DevTools Console で次を確認:
   - `[syncClient] starting as itsuki-xxxxxx`
   - `[syncClient] connected to chat_sync: wss://chat.knd.cloud/ws`
   - `<- joined` → visitor 接続時に `<- peer-joined` → `pc state: connected`
3. 別デバイス（iPhone/Android/Win/Mac）で `https://chat.knd.cloud/` を開く。
   - itsuki 在席のため入室でき、双方向の映像・音声が出る。
   - `https://chat.knd.cloud/?debug=<DEBUG_TOKEN>` で getStats オーバーレイを表示し、`framesDecoded` / `framesEncoded` が増加、`pktLoss` が低いことを確認（`DEBUG_TOKEN` は chat_sync の値）。
4. 異常系:
   - visitor 切断 → `/webrtc` Console に `<- peer-left`、その後別 visitor で再接続できる。
   - `/webrtc` の WS を一時切断（ネットワーク断）→ `reconnecting in ...ms` を経て自動復帰。

> room 上限 2 のため、**`/webrtc` は同時 1 台のみ**接続する（2 台目は `room-full`）。

---

## 3. Path B: 本番に触れないローカル E2E（開発検証）

本番の展示に影響を与えず 1 台のマシンで完結させる。coturn 無しでも localhost 同士なら host
candidate で P2P が成立する。`localhost` は secure context 扱いなので平文 HTTP/ws で getUserMedia が使える。

### 3.1 ローカル chat_sync を起動（production モード = 平文 HTTP/ws :3000）

```bash
git clone --depth 1 https://github.com/kndkndknd/chat_sync /tmp/chat_sync_local
cd /tmp/chat_sync_local/backend
npm install --no-save express selfsigned ws        # 純 JS 依存のみ
# tsx は chat_itsuki のものを流用してよい
NODE_ENV=production PORT=3000 npx tsx src/server.ts
# → "サーバー起動中: http://0.0.0.0:3000"
```

### 3.2 シグナリング契約のヘッドレス確認（任意・高速）

ブラウザ前に、SyncClient が依存する chat_sync の契約を smoke test で確認する:

```bash
cp /home/knd/20260531/chat_itsuki/document/chatSyncSignalingSmoke.mjs /tmp/chat_sync_local/backend/
cd /tmp/chat_sync_local/backend && node chatSyncSignalingSmoke.mjs
# → 8/8 passed を確認 (joined / 役割分配 / offer・answer・ICE リレー / itsuki-required ゲート)
```

> 注: smoke test の visitor は営業時間外でも通るよう `?debug=<token>` でバイパスしている。
> このスクリプトは chat_sync の挙動を検証するもので、ブラウザ側 SyncClient の検証は 3.3 で行う。

### 3.3 ブラウザでの双方向通話

```bash
# /webrtc を localhost で配信（secure context）
VITE_CHAT_SYNC_URL="ws://localhost:3000/ws" pnpm -C packages/frontend build
npx serve -l 5000 packages/backend/static          # 任意の静的サーバでも可
```

- タブ1（itsuki = `/webrtc`）: `http://localhost:5000/webrtc` を開く → 自動で join。
- タブ2（visitor）: chat_sync のフロントを使う。`/tmp/chat_sync_local` で
  `pnpm -F frontend build` 後、`http://localhost:3000/?debug=<DEBUG_TOKEN>` を開く
  （`DEBUG_TOKEN` は chat_sync `server.ts` の値。営業時間外バイパス + overlay 表示）。
- 双方向の映像・音声が出れば成功。overlay で `framesDecoded` 増加を確認。

> chat_itsuki 本体の backend（Mongo/Redis 等）は WebRTC には不要（SyncClient は chat_sync に直結）。
> ただし `/webrtc` ページは chat_itsuki 自身の WS にも接続を試みるため、backend 未起動だと
> Console に再接続エラーが出る（WebRTC 機能には無害）。

---

## 4. 成功判定チェックリスト

- [ ] `/webrtc` Console: `connected to chat_sync` → `peer-joined`/`peer-ready` → `pc state: connected`
- [ ] visitor 側 overlay: `framesDecoded` と `framesEncoded` が継続的に増加
- [ ] 双方向で映像・音声が再生される（`#remoteVideo` が前面化、z-index:10）
- [ ] visitor 切断後に別 visitor で再接続できる
- [ ] WS 切断 → 自動再接続して復帰
- [ ] backend ログに ffmpeg spawn が無い／`/pi`・`/counter` 等が従来動作

---

## 5. トラブルシュート

| 症状 | 原因 / 対処 |
|---|---|
| visitor が `not-available` | itsuki 不在。`/webrtc` 側が `itsuki-` プレフィックスで join できているか確認（`syncConfig.ts` の `ITSUKI_PEER_PREFIX`） |
| visitor が `closed` | 営業時間外（平日 11–19 / 日 11–18 JST）。visitor URL に `?debug=<token>` を付ける（itsuki は常に可） |
| `room-full` | `/webrtc` が 2 台以上繋いでいる。1 台に絞る |
| 映像が出ない / `framesDecoded=0` | コーデック不一致は今回ブラウザ任せのため通常起きない。relay 未確立を疑う → coturn 到達性 / `turns:5349` フォールバック / overlay の candidate-pair を確認 |
| 自動起動しない | Chrome のカメラ/マイク権限が未許可、または autoplay ブロック。サイト設定で許可、キオスク起動フラグを付与 |
| `/webrtc` で映像送出されない | `streamState.stream` 未準備。SyncClient は最大 ~10 秒リトライ。getUserMedia 失敗（デバイス占有等）を Console で確認 |

---

## 6. 後片付け

```bash
# ローカル chat_sync 停止（起動したシェルで Ctrl-C、またはポート保持プロセスを kill）
# 一時クローンの削除
rm -rf /tmp/chat_sync_local
# 検証用ビルドを本番設定に戻す
pnpm -C packages/frontend build
```
