import { vi } from "vitest";

// Node 環境で window.setInterval / window.location などを使う関数を import 可能にするため、
// window を globalThis にエイリアスし、必要な最小プロパティを生やす。
if (typeof (globalThis as any).window === "undefined") {
  (globalThis as any).window = globalThis;
}
if (typeof (globalThis as any).window.location === "undefined") {
  (globalThis as any).window.location = { href: "http://localhost/", host: "localhost", pathname: "/" };
}

// WebSocket は SocketFacade.ts のクラス定義 import を通すためだけのスタブ。
// 本テストで対象とする serialize/deserialize は WebSocket に触れない。
if (typeof (globalThis as any).WebSocket === "undefined") {
  class MockWebSocket {
    static OPEN = 1;
    static CLOSED = 3;
    static CLOSING = 2;
    static CONNECTING = 0;
    url: string;
    readyState = MockWebSocket.CONNECTING;
    constructor(url: string) {
      this.url = url;
    }
    addEventListener = vi.fn();
    removeEventListener = vi.fn();
    send = vi.fn();
    close = vi.fn();
  }
  (globalThis as any).WebSocket = MockWebSocket;
}
