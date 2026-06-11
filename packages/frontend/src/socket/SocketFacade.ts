type Handler = (data: any) => void;

export const deserialize = (raw: string): { type: string; data: unknown } => {
  return JSON.parse(raw, (_key, value) => {
    if (value && typeof value === "object" && value.__type === "ArrayBuffer") {
      const binary = atob(value.data as string);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes.buffer;
    }
    return value;
  });
};

export const serialize = (event: string, data: unknown): string => {
  return JSON.stringify({ type: event, data }, (_key, value) => {
    if (value instanceof ArrayBuffer) {
      const bytes = new Uint8Array(value);
      let binary = "";
      const CHUNK = 8192;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + CHUNK)));
      }
      return { __type: "ArrayBuffer", data: btoa(binary) };
    }
    return value;
  });
};

export class SocketFacade {
  id: string = "";
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Handler[]>();
  private url: string;

  // 再接続制御
  private shouldReconnect = true;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private static readonly RECONNECT_BASE_MS = 1000;
  private static readonly RECONNECT_MAX_MS = 30_000;

  constructor(url: string) {
    this.url = url;
    this._connect();
  }

  private _connect(): void {
    this.ws = new WebSocket(this.url);

    this.ws.addEventListener("open", () => {
      console.log("WebSocket connected");
      this.reconnectAttempt = 0;
    });

    this.ws.addEventListener("message", (event: MessageEvent) => {
      let msg: { type: string; data: unknown };
      try {
        msg = deserialize(event.data as string);
      } catch {
        console.error("invalid JSON from server");
        return;
      }

      if (msg.type === "connected") {
        this.id = (msg.data as { id: string }).id;
        (this.handlers.get("connected") ?? []).forEach((fn) => fn(msg.data));
        return;
      }

      (this.handlers.get(msg.type) ?? []).forEach((fn) => fn(msg.data));
    });

    this.ws.addEventListener("close", () => {
      (this.handlers.get("disconnect") ?? []).forEach((fn) => fn(undefined));
      this._scheduleReconnect();
    });

    this.ws.addEventListener("error", (event) => {
      console.error("WebSocket error", event);
      // close も発火するので再接続は close 側に任せる
    });
  }

  private _scheduleReconnect(): void {
    if (!this.shouldReconnect) return;
    if (this.reconnectTimer !== null) return;

    const delay = Math.min(
      SocketFacade.RECONNECT_BASE_MS * 2 ** this.reconnectAttempt,
      SocketFacade.RECONNECT_MAX_MS,
    );
    this.reconnectAttempt++;
    console.log(`WebSocket reconnecting in ${delay}ms (attempt ${this.reconnectAttempt})`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.shouldReconnect) return;
      this._connect();
    }, delay);
  }

  on(event: string, handler: Handler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  emit(event: string, data?: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(serialize(event, data));
    }
  }

  // 互換のため残置。明示的な再接続トリガとして利用可能だが、
  // 通常は close 後に SocketFacade が自動再接続するため呼ぶ必要はない。
  connect(): void {
    this.shouldReconnect = true;
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
      // バックオフ中なら待たずに即試行
      if (this.reconnectTimer !== null) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      this._connect();
    }
  }

  // 明示的な切断（自動再接続を抑止する）
  close(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
  }
}
