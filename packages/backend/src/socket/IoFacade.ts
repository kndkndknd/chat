import WebSocket from "ws";
import crypto from "crypto";

const serializeMessage = (event: string, data: unknown): string => {
  return JSON.stringify({ type: event, data }, (_key, value) => {
    if (value instanceof ArrayBuffer) {
      return { __type: "ArrayBuffer", data: Buffer.from(value).toString("base64") };
    }
    return value;
  });
};

export class IoFacade {
  private clients = new Map<string, WebSocket>();

  addClient(id: string, ws: WebSocket): void {
    this.clients.set(id, ws);
  }

  removeClient(id: string): void {
    this.clients.delete(id);
  }

  emit(event: string, data?: unknown): void {
    const message = serializeMessage(event, data);
    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  to(id: string): { emit: (event: string, data?: unknown) => void } {
    return {
      emit: (event: string, data?: unknown) => {
        const ws = this.clients.get(id);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(serializeMessage(event, data));
        }
      },
    };
  }

  generateId(): string {
    return crypto.randomUUID();
  }
}
