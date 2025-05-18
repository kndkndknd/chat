import { clientId } from "./clientId";
import { cmdMessage } from "./cmdMessage";

const wsUrl = "wss://localhost:8888";

export const connectWebSocket = () => {
  const ws = new WebSocket(wsUrl);
  ws.onopen = () => {
    console.log("WebSocket connection opened");
    ws.send(JSON.stringify({ type: "register", id: clientId }));
  };
  ws.onmessage = (event) => {
    // console.log("websocket data:", event.data);
    const message = JSON.parse(event.data);

    if (message.type === "cmd") {
      cmdMessage(message);
    } else if (message.type === "sinewave") {
    } else if (message.type === "streamReq") {
    } else if (message.type === "stop") {
    }
    //   }
    // }
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
