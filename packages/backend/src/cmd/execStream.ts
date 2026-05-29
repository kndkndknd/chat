import { chatPreparation } from "../stream/chatPreparation";
import { recordEmit } from "../stream/recordEmit";
import { voiceEmit } from "./voiceEmit";
import { streamEmit } from "../stream/streamEmit";
import { streamList } from "../data";

export const execStream = async (
  source: string,
  id: string,
  index?: number
): Promise<void> => {
  if (source === "CHAT") {
    chatPreparation();
    voiceEmit(source, id);
  } else if (source === "RECORD" || source === "REC") {
    recordEmit();
    voiceEmit("RECORD", id);
  } else if (streamList.includes(source)) {
    console.log("in stream");
    streamEmit(source, undefined, undefined, index);
    voiceEmit(source, id);
  }
};
