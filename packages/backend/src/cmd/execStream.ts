import { chatPreparation } from "../stream/chatPreparation";
import { recordEmit } from "../stream/recordEmit";
import { voiceEmit } from "./voiceEmit";
import { streamEmit } from "../stream/streamEmit";
import { streamList } from "../data";
import { streamState, clientState } from "../state";

export const execStream = async (
  source: string,
  id: string,
  index?: number,
  from?: string,
  targetId?: string[],
): Promise<void> => {
  // targetId が指定されていればその端末のみを再生範囲にする
  if (targetId && source !== "RECORD" && source !== "REC") {
    streamState.target[source] = targetId;
  } else if (!targetId) {
    for(const id in clientState.client) {
      if(clientState.client[id].stream && !streamState.target[source]?.includes(id)) {
        streamState.target[source]?.push(id);
      }
    }
  }

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
