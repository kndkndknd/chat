import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const OriginalWebSocket = (globalThis as any).WebSocket;

class FakeWebSocket {
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  url: string;
  readyState = FakeWebSocket.CONNECTING;
  sent: string[] = [];
  private listeners: Record<string, Array<(event?: any) => void>> = {};

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type: string, handler: (event?: any) => void): void {
    (this.listeners[type] ??= []).push(handler);
  }

  removeEventListener(type: string, handler: (event?: any) => void): void {
    this.listeners[type] = (this.listeners[type] ?? []).filter(
      (fn) => fn !== handler,
    );
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = FakeWebSocket.CLOSED;
    this.dispatch("close");
  }

  open(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.dispatch("open");
  }

  message(data: string): void {
    this.dispatch("message", { data });
  }

  listenerCount(type: string): number {
    return (this.listeners[type] ?? []).length;
  }

  private dispatch(type: string, event?: any): void {
    (this.listeners[type] ?? []).forEach((fn) => fn(event));
  }
}

import { SocketFacade, serialize } from "../../../src/socket/SocketFacade";

const latest = (): FakeWebSocket =>
  FakeWebSocket.instances[FakeWebSocket.instances.length - 1];

describe("SocketFacade", () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    (globalThis as any).WebSocket = FakeWebSocket;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    (globalThis as any).WebSocket = OriginalWebSocket;
  });

  it("接続時に WebSocket を生成してイベントを購読する", () => {
    new SocketFacade("ws://localhost/ws");

    const ws = latest();
    expect(ws.url).toBe("ws://localhost/ws");
    expect(ws.listenerCount("open")).toBe(1);
    expect(ws.listenerCount("message")).toBe(1);
    expect(ws.listenerCount("close")).toBe(1);
    expect(ws.listenerCount("error")).toBe(1);
  });

  it("on で登録したハンドラに type/data を配送する", () => {
    const facade = new SocketFacade("ws://localhost/ws");
    const handler = vi.fn();
    facade.on("cmdFromServer", handler);

    latest().message(
      JSON.stringify({ type: "cmdFromServer", data: { cmd: "BASS" } }),
    );

    expect(handler).toHaveBeenCalledWith({ cmd: "BASS" });
  });

  it("connected で id を保存し connected ハンドラを呼ぶ", () => {
    const facade = new SocketFacade("ws://localhost/ws");
    const handler = vi.fn();
    facade.on("connected", handler);

    latest().message(JSON.stringify({ type: "connected", data: { id: "c1" } }));

    expect(facade.id).toBe("c1");
    expect(handler).toHaveBeenCalledWith({ id: "c1" });
  });

  it("OPEN のときだけ emit し、切断中は送信しない", () => {
    const facade = new SocketFacade("ws://localhost/ws");
    const ws = latest();

    ws.readyState = FakeWebSocket.OPEN;
    expect(facade.isOpen).toBe(true);
    facade.emit("gainFromClient", { MASTER: 1 });

    expect(ws.sent).toEqual([serialize("gainFromClient", { MASTER: 1 })]);

    ws.readyState = FakeWebSocket.CLOSED;
    expect(facade.isOpen).toBe(false);
    facade.emit("gainFromClient", { MASTER: 0.5 });

    expect(ws.sent).toHaveLength(1);
  });

  it("切断時に指数バックオフで再接続する", () => {
    new SocketFacade("ws://localhost/ws");

    latest().close();
    vi.advanceTimersByTime(999);
    expect(FakeWebSocket.instances).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(FakeWebSocket.instances).toHaveLength(2);

    latest().close();
    vi.advanceTimersByTime(1999);
    expect(FakeWebSocket.instances).toHaveLength(2);

    vi.advanceTimersByTime(1);
    expect(FakeWebSocket.instances).toHaveLength(3);
  });

  it("close は自動再接続を停止する", () => {
    const facade = new SocketFacade("ws://localhost/ws");

    facade.close();
    vi.advanceTimersByTime(60_000);

    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it("connect は CLOSED なら即座に再接続する", () => {
    const facade = new SocketFacade("ws://localhost/ws");
    facade.close();

    facade.connect();

    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it("切断時に disconnect ハンドラを呼ぶ", () => {
    const facade = new SocketFacade("ws://localhost/ws");
    const handler = vi.fn();
    facade.on("disconnect", handler);

    latest().close();

    expect(handler).toHaveBeenCalledWith(undefined);
  });
});
