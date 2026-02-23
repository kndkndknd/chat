import WebSocket from "ws";
import { webSocketServerInfo } from "./webSocketConnection";

export function sendCharWebSocket(char: string) {
  if (!webSocketServerInfo.connect) {
    const ws = new WebSocket(webSocketServerInfo.wsUrl);
    ws.send(char);
  } else {
    console.log("WebSocket connection is not available");
  }
}
