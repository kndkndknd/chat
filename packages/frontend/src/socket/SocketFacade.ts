type Handler = (data: any) => void;

const deserialize = (raw: string): { type: string; data: unknown } => {
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

const serialize = (event: string, data: unknown): string => {
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

  constructor(url: string) {
    this.url = url;
    this._connect();
  }

  private _connect(): void {
    this.ws = new WebSocket(this.url);

    this.ws.addEventListener("open", () => {
      console.log("WebSocket connected");
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
    });

    this.ws.addEventListener("error", (event) => {
      console.error("WebSocket error", event);
    });
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

  connect(): void {
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
      this._connect();
    }
  }
}
