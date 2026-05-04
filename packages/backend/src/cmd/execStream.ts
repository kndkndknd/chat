import { chatPreparation } from "../stream/chatPreparation";
import { recordEmit } from "../stream/recordEmit";
import { voiceEmit } from "./voiceEmit";
import { streamEmit } from "../stream/streamEmit";
import { streamList } from "../data";

export const execStream = async (
  strings: string,
  id: string
): Promise<void> => {
  if (strings === "CHAT") {
    chatPreparation();
    voiceEmit(strings, id);
  } else if (strings === "RECORD" || strings === "REC") {
    recordEmit();
    voiceEmit("RECORD", id);
  } else if (streamList.includes(strings)) {
    console.log("in stream");
    streamEmit(strings);
    voiceEmit(strings, id);
  }
};
