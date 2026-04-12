import { webSocketState, clientState, currentState } from "../state";
import { emitChat } from "./chat/emitChat";
import { emitStream } from "./emitStream";

export const reqStream = (source: string, ip?: string) => {
  const targetClient = ip !== undefined ?webSocketState.clientId.find(client => client.ip === ip) : undefined;
  if(currentState.stream[source]) {
    if(source === "CHAT") {
      if(!currentState.stream.CHAT) {
        currentState.stream.CHAT = true;
      }
      emitChat(targetClient?.id);
    } else {
      if(!currentState.stream[source]) {
        currentState.stream[source] = true;
      }
      emitStream(source, targetClient?.id);
    }
  } else {
    console.log(`Stream source ${source} is not active. Cannot emit stream.`);
  }
};
