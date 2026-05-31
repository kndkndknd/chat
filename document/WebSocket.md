# WebSocket 実装ドキュメント

socket.io から native WebSocket (ws) への移行実装の説明。

---

## 全体アーキテクチャ

```
【フロントエンド】                        【バックエンド】
                                         
 main.ts                                  app.ts
   └─ new SocketFacade(wsUrl)               └─ wsServer(httpserver)
        │                                        │
        │  wss://host/ws (WebSocket接続)          │
        │ ════════════════════════════════════> │
        │                                       WebSocket.Server
        │                                        │
        │ <──── { type:"connected", data:{id} } ─┤
        │                                        └─ IoFacade
        │                                             │
  SocketFacade                                        │ ioState.io として保持
  (handlers Map)                               (clients Map)
        │                                             │
        │  JSON メッセージ双方向通信                    │
        │ ════════════════════════════════════════════╗
        ▼                                            ▼
  socket.ts                                各種ハンドラ
  (イベント登録)                            (chatReceive, streamEmit 等)
```

---

## メッセージプロトコル

全メッセージは JSON 形式で送受信する。

```json
{ "type": "イベント名", "data": <ペイロード> }
```

### ArrayBuffer のシリアライズ

音声データ (`Float32Array.buffer`) などのバイナリは JSON 内で Base64 エンコードする。

**送信側（シリアライズ）:**
```json
{
  "__type": "ArrayBuffer",
  "data": "<Base64文字列>"
}
```

**受信側（デシリアライズ）:**
上記オブジェクトを検出したら `ArrayBuffer` に復元する。

---

## ファイル別説明

### バックエンド

---

#### `packages/backend/src/socket/IoFacade.ts`

socket.io の `Server` クラスと互換のインターフェースを提供するファサードクラス。  
コードベース全体の `ioState.io.emit()` / `ioState.io.to(id).emit()` 呼び出しをそのまま動かすために設計されている。

**主要メンバー:**

| メンバー | 説明 |
|---|---|
| `clients: Map<string, WebSocket>` | 接続中クライアントの管理テーブル |
| `addClient(id, ws)` | `wsServer` が接続時に呼ぶ |
| `removeClient(id)` | `wsServer` が切断時に呼ぶ |
| `emit(event, data?)` | 全クライアントにブロードキャスト |
| `to(id).emit(event, data?)` | 特定クライアントに送信 |
| `generateId()` | `crypto.randomUUID()` でクライアントIDを生成 |

**`serializeMessage` (内部関数):**  
`JSON.stringify` のカスタム replacer で `ArrayBuffer` を `{ __type, data }` 形式に変換して送信する。

```
ArrayBuffer → Buffer.from(value).toString("base64") → { __type: "ArrayBuffer", data: "..." }
```

---

#### `packages/backend/src/socket/wsServer.ts`

HTTPS サーバーに WebSocket サーバーを付与し、全クライアントイベントをルーティングするエントリポイント。  
`app.ts` から `wsServer(httpserver)` として呼ばれる。

**初期化処理:**
1. `IoFacade` インスタンスを生成し `ioState.io` にセット
2. `WebSocket.Server` を `/ws` パスで起動
3. クライアント接続ごとに UUID を発行し `IoFacade.addClient()` で登録

**接続フロー:**
```
クライアント接続
  ↓
UUID = facade.generateId()
ipAddress = req.socket.remoteAddress から抽出
facade.addClient(id, ws)
ws.send({ type: "connected", data: { id } })  ← クライアントに ID を通知
```

**受信イベント一覧 (client → server):**

| イベント | データ型 | 処理 |
|---|---|---|
| `connectFromClient` | `{ clientMode, urlPathName, width, height, isMobile }` | `connectFromClient()` でクライアント状態を初期化、成功時 `debugFromServer` を返す |
| `charFromClient` | `string` | `charProcess()` でコマンド文字を蓄積・解析 |
| `chatFromClient` | `buffStateType` | `chatReceive()` でバッファをRedisにプッシュし、配信先に転送 |
| `streamReqFromClient` | `string` (source名) | `streamEmit()` でストリームバッファを該当クライアントに送信 |
| `workletBufferFromClient` | `{ video, audio: ArrayBuffer, source, bufferSize }` | `workletBufferFromClient()` でAudioWorkletバッファをRedisに保存 |
| `bufferRecFromClient` | `ArrayBuffer` | 録音WebMデータ受信（現状ログのみ） |
| `bufferFromClient` | `ArrayBuffer` | `feedWebMChunk()` でweriftのWebRTCパイプラインに渡す |
| `wholeReqFromClient` | `{ audio, video, source, bufferSize } \| undefined` | `receiveWholeReq()` でWHOLEストリーム処理 |
| `faceDetectFromClient` | `{ x, width, height }` | 顔検出カウンタをインクリメント、PAYBACKバッファをタイムスタンプ検索して送信 |

**切断処理:**
```
ws.on("close")
  ↓
facade.removeClient(id)
clientState.client[id] を削除
clientState.streamClient, cmdClient から除去
bpmState[id] を削除
```

**`deserialize` (内部関数):**  
受信 JSON を `JSON.parse` のカスタム reviver でパースし、`__type: "ArrayBuffer"` を検出したら `Buffer.from(base64, "base64").buffer` で `ArrayBuffer` に復元する。

---

#### `packages/backend/src/socket/ioEmit.ts`

文字列メッセージのユーティリティ送信関数。  
コードベース全体から `stringEmit(strings, timeout?, target?)` として呼ばれる。

```typescript
// 全クライアントへ
ioState?.io.emit("stringsFromServer", { strings, timeout });

// 特定クライアントへ
ioState?.io.to(target).emit("stringsFromServer", { strings, timeout });
```

---

#### `packages/backend/src/state/states/ioState.ts`

`IoFacade` インスタンスのシングルトン保持オブジェクト。  
バックエンド全体からインポートされ、`ioState.io.emit()` / `ioState.io.to(id).emit()` でメッセージを送信する共通のアクセス点となる。

```typescript
export const ioState = {
  io: null as IoFacade | null,
}
```

`wsServer()` 実行時に `ioState.io = facade` としてセットされる。

---

### フロントエンド

---

#### `packages/frontend/src/socket/SocketFacade.ts`

socket.io-client の `Socket` クラスと互換のインターフェースを提供するファサードクラス。  
ブラウザ標準の `WebSocket` API をラップし、`on()` / `emit()` / `connect()` / `.id` プロパティを提供する。

**主要メンバー:**

| メンバー | 説明 |
|---|---|
| `id: string` | サーバーから受け取る UUID（接続後に設定） |
| `ws: WebSocket` | 内部の WebSocket インスタンス |
| `handlers: Map<string, Handler[]>` | イベント名 → ハンドラ関数の登録テーブル |
| `on(event, handler)` | サーバーからのイベントハンドラを登録 |
| `emit(event, data?)` | サーバーへメッセージを送信 |
| `connect()` | 即時再接続（バックオフ中の待機をキャンセルして再試行）。通常は自動再接続に任せる |
| `close()` | 明示的な切断。自動再接続を抑止する |

**自動再接続:**

`close` イベントを検知すると `_scheduleReconnect()` が指数バックオフで再接続する。

| 項目 | 値 |
|---|---|
| 初回ディレイ | 1000ms |
| 上限 | 30,000ms (`1s → 2s → 4s → 8s → 16s → 30s → 30s …`) |
| 重複タイマー防止 | `reconnectTimer !== null` でガード |
| 接続成功時 | `reconnectAttempt = 0` にリセット |
| `close()` 呼び出し時 | `shouldReconnect = false` にして再接続を抑止 |

**`_connect()` の動作:**

```
new WebSocket(url)
  │
  ├─ open    → ログ出力
  ├─ message → deserialize → type="connected" なら id をセットして "connected" ハンドラを呼ぶ
  │                        → その他は handlers Map からハンドラを呼ぶ
  ├─ close   → "disconnect" ハンドラを呼ぶ
  └─ error   → ログ出力
```

**`serialize` (内部関数):**  
`JSON.stringify` の replacer で `ArrayBuffer` を Base64 に変換する。大きなバッファでも効率的なよう 8192 バイト単位でチャンク処理する。

```
ArrayBuffer → 8192byte チャンクに分割 → String.fromCharCode → btoa → { __type, data }
```

**`deserialize` (内部関数):**  
受信 JSON を `JSON.parse` の reviver でパースし、`__type: "ArrayBuffer"` を `atob → Uint8Array → .buffer` で `ArrayBuffer` に復元する。

---

#### `packages/frontend/src/state/socketState.ts`

`SocketFacade` インスタンスのシングルトン保持オブジェクト。

```typescript
export const socketState = {
  socket: null as SocketFacade | null,  // SocketFacade インスタンス
  socketId: null as string | null,       // サーバー発行の UUID
}
```

---

#### `packages/frontend/src/main.ts`

アプリケーションのエントリポイント。WebSocket 接続の初期化と再接続ハンドリングを担う。

**初期化:**
```typescript
const wsUrl = `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws`;
socketState.socket = new SocketFacade(wsUrl);
```

`location.host` を利用するため、バックエンドと同一オリジン（ポート含む）から配信される構成で動作する。

**`connected` ハンドラ:**  
初回接続・再接続の両方で発火する。

```typescript
socketState.socket.on("connected", (data) => {
  socketState.socketId = data.id;          // UUID を保存
  if (flagState.start) {
    // 再接続時: サーバーのクライアント状態が消えているため再登録する
    socketState.socket.emit("connectFromClient", { ... });
  }
});
```

`flagState.start` は `initialize()` 完了後に `true` になる。再接続時はこのフラグで初期化済みかを判定し、`connectFromClient` を自動再送してサーバーのクライアント管理テーブルを復元する。

---

#### `packages/frontend/src/socket.ts`

サーバーから受信する全イベントのハンドラを登録する関数。  
`main.ts` から `socket()` として呼ばれる。

**登録イベント一覧 (server → client):**

| イベント | 処理 |
|---|---|
| `stringsFromServer` | キャンバスにテキストを表示 |
| `erasePrintFromServer` | キャンバスのテキストを消去 |
| `cmdFromServer` | BPM・ストリーム等のコマンドを適用 |
| `stopFromServer` | 音声フェードアウト・停止 |
| `chatReqFromServer` | 次のCHATバッファを要求 (`chatReq`) |
| `recordReqFromServer` | 録音開始 |
| `chatFromServer` | 音声+映像チャンクを受信して再生 |
| `streamFromServer` | CHAT以外のストリームを受信して再生 |
| `workletBufferFromServer` | AudioWorkletバッファを受信して再生 |
| `quantizeFromServer` | クォンタイズ設定を適用 |
| `gainFromServer` | ゲイン変更 |
| `voiceFromServer` | SpeechSynthesis で音声読み上げ |
| `emojiFromServer` | 絵文字表示 |
| `bpmFromServer` | BPM・拍子情報を更新 |
| `timelapseFromServer` | タイムラプスモード切替 |
| `gpsFlagFromServer` | GPS取得フラグ切替 |
| `accelarateFlagFromServer` | 加速度センサーフラグ切替 |
| `bufferRecReqFromServer` | チャンク録画開始 |
| `bufferFromServer` | WebM動画データを受信して再生 |
| `wholeCmdFromServer` | WHOLEコマンド処理 |
| `personDetectFromServer` | フリッカリング演出 |
| `disconnect` | 1秒後に `connect()` で再接続 |

---

## 接続・切断・再接続の全体フロー

```
【初回接続】

フロント: new SocketFacade(wsUrl)
  └─ new WebSocket("wss://host/ws")
       │
       ▼
バック: WebSocket.Server "connection" イベント
  ├─ id = crypto.randomUUID()
  ├─ facade.addClient(id, ws)
  └─ ws.send({ type:"connected", data:{ id } })
       │
       ▼
フロント: "connected" ハンドラ
  ├─ this.id = id
  ├─ socketState.socketId = id
  └─ flagState.start が false → 何もしない（ユーザーのクリック待ち）

フロント: ユーザーがクリック
  └─ initialize(socket)
       └─ socket.emit("connectFromClient", { clientMode, urlPathName, ... })
            │
            ▼
       バック: connectFromClient()
         ├─ clientState.client[id] = { ipAddress, stream, ... }
         ├─ clientState.streamClient.push(id)
         ├─ clientState.cmdClient.push(id)
         ├─ bpmState[id] = { ... }
         └─ ws.send({ type:"debugFromServer" })
            │
            ▼
       flagState.start = true

---

【ストリーム再生フロー (CHAT例)】

バック: chatEmit() が発火
  └─ ioState.io.to(targetId).emit("chatReqFromServer")
       │
       ▼
フロント: "chatReqFromServer" ハンドラ
  └─ chatReq(socketState.socket.id)  ← chatFlag をセット

AudioWorklet: マイク音声バッファが溜まる
  └─ socket.emit("workletBufferFromClient", { audio: ArrayBuffer, ... })
       │  ※ ArrayBuffer は Base64 JSON でシリアライズ
       ▼
バック: workletBufferFromClient()
  └─ Redis に保存 → pushStateStream("source")
       └─ streamEmit("source") → targetId へ chatFromServer

フロント: "chatFromServer" ハンドラ
  └─ new Float32Array(data.audio) → streamPlay()

---

【切断・再接続フロー】

WebSocket 切断
  │
  ├─ バック: ws.on("close")
  │    ├─ facade.removeClient(id)
  │    ├─ clientState.client[id] 削除
  │    ├─ streamClient / cmdClient から除去
  │    └─ bpmState[id] 削除
  │
  └─ フロント: SocketFacade._scheduleReconnect()
       └─ 指数バックオフ後 → _connect()
            └─ new WebSocket(url)  ← 再接続
                 │
                 ▼
            バック: 新しい id を発行 → "connected" 送信
                 │
                 ▼
            フロント: "connected" ハンドラ
              ├─ socketState.socketId = 新id
              └─ flagState.start が true → socket.emit("connectFromClient", ...)
                   └─ サーバーのクライアント管理テーブルを再構築
```

---

## 主要ファイル一覧

| ファイル | 役割 |
|---|---|
| `backend/src/socket/IoFacade.ts` | socket.io `Server` 互換のサーバー側送信インターフェース |
| `backend/src/socket/wsServer.ts` | WebSocket サーバー本体・イベントルーティング |
| `backend/src/socket/ioEmit.ts` | `stringEmit` ユーティリティ |
| `backend/src/state/states/ioState.ts` | `IoFacade` シングルトン |
| `frontend/src/socket/SocketFacade.ts` | socket.io-client `Socket` 互換のクライアント側インターフェース |
| `frontend/src/state/socketState.ts` | `SocketFacade` シングルトン |
| `frontend/src/main.ts` | 接続初期化・再接続ハンドリング |
| `frontend/src/socket.ts` | サーバーイベントハンドラの登録 |
| `frontend/src/form/main.ts` | フォームページ用の独立した接続 |
