import { chatPreparation } from "../stream/chatPreparation";
import { recordEmit } from "../stream/recordEmit";
import { voiceEmit } from "./voiceEmit";
import { streamEmit } from "../stream/streamEmit";
import { streamList } from "../data";

export const execStream = async (
  source: string,
  id: string,
  index?: number,
  from?: string
): Promise<void> => {
  if (source === "CHAT") {
    chatPreparation();
    voiceEmit(source, id);
  } else if (source === "RECORD" || source === "REC") {
    recordEmit();
    voiceEmit("RECORD", id);
  } else if (streamList.includes(source)) {
    console.log("in stream");
    // from が指定されていればその端末を起点に再生する
    streamEmit(source, from ?? undefined, undefined, index);
    voiceEmit(source, id);
  }
};
