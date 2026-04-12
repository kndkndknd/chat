import { WebSocketServer, WebSocket } from "ws";

type WebSocketState = {
  wss: WebSocketServer | null;
  clientId: { id: string; ws: WebSocket; ip: string }[];
};

export const webSocketState: WebSocketState = {
  wss: null,
  clientId: [],
};
