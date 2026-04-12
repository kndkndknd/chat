import { emitChatReq } from "../stream/chat/emitChatReq";
import { recordEmit } from "../stream/recordEmit";
import { voiceEmit } from "./voiceEmit";
import { emitStream } from "../stream/emitStream";
import { streamList } from "../data";
import { currentState } from "../state";

export const execStream = async (
  strings: string,
  id: string,
): Promise<void> => {
  if (strings === "CHAT") {
    currentState.stream.CHAT = true;
    emitChatReq();
  } else if (strings === "RECORD" || strings === "REC") {
    recordEmit();
  } else if (streamList.includes(strings)) {
    console.log("in stream");
    currentState.stream[strings] = true;
    emitStream(strings);
  }
  voiceEmit(strings, id);
};

