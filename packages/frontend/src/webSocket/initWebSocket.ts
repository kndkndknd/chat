import { onMessage } from "./onMessage";
import { webSocketType } from "../../../../types";

import { urlState } from "../state";

// const wsUrl = "wss://localhost:8888";

export const initWebSocket = () => {
  const wsUrl = `wss://${urlState.localServer}`;
  console.log("wsUrl:", wsUrl);
  const ws = new WebSocket(wsUrl);
  ws.onopen = () => {
    console.log("WebSocket connection opened");
    // ws.send(JSON.stringify({ type: "register", id: clientId }));
  };
  ws.onmessage = (event) => {
    // console.log("websocket data:", event.data);
    const message: webSocketType = JSON.parse(event.data);
    onMessage(message);
  };

  ws.onclose = () => {
    console.log("websocket closed");
    setTimeout(() => {
      initWebSocket();
    }, 3000);
  };
  ws.onerror = (err) => {
    console.log(err);
    ws.close();
  };
  return ws;
};
