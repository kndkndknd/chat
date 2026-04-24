import { cmdMessage } from "./cmdMessage";
import { wsState } from "../state/webSocketState";

const wsUrl = `wss://${location.host}/ws`;

export const connectWebSocket = () => {
  const ws = new WebSocket(wsUrl);
  wsState.ws = ws;

  ws.onopen = () => {
    console.log("WebSocket connection opened");
  };
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);

    if (message.type === "connected") {
      wsState.clientId = message.payload.id;
      console.log("connected:", message);
    } else if (message.type === "cmd") {
      cmdMessage(message);
    } else if (message.type === "sinewave") {
    } else if (message.type === "streamReq") {
    } else if (message.type === "stop") {
    }
  };

  ws.onclose = () => {
    console.log("websocket closed");
    setTimeout(() => {
      connectWebSocket();
    }, 3000);
  };
  ws.onerror = (err) => {
    console.log(err);
    ws.close();
  };
  return ws;
};
