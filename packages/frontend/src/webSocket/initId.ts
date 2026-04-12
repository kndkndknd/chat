import { webSocketState } from "../state/";
import { initSocketType } from "../../../../types";

export const initId = (message: initSocketType) => {
  webSocketState.clientId = message.payload.id;
  console.log("Client ID initialized:", webSocketState.clientId);
};
