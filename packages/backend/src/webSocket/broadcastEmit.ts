import { webSocketState } from "../state";
import { webSocketType } from "../../../../types";

export const broadcastEmit = (message: webSocketType) => {
  webSocketState.wss?.clients.forEach((client) => {
    client.send(JSON.stringify(message));
  });
};
