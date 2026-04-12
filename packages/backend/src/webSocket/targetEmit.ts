import { webSocketState } from "../state";
import { webSocketType } from "../../../../types";

export const targetEmit = (target: string, message: webSocketType) => {
  webSocketState.clientId.forEach((client) => {
    if (client.id === target) {
      client.ws.send(JSON.stringify(message));
    }
  });
};
