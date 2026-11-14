import { chatPreparation } from "../stream/chatPreparation";
import { recordEmit } from "../stream/recordEmit";
import { voiceEmit } from "../socket/ioEmit";
import { execStream } from "../stream/execStream";
import { streamList } from "../data";
import { streamState, clientState } from "../state";

export const execStreamPreparation = async (
  source: string,
  id: string,
  index?: number,
  from?: string,
  targetId?: string[],
  forcedTarget?: string,
): Promise<void> => {
  // 強制宛先は target 配列にも反映し、2チャンク目以降の request でも
  // 同じ端末へ送り続けられるようにする。
  if (source !== "RECORD" && source !== "REC") {
    if (forcedTarget !== undefined && forcedTarget !== "") {
      streamState.target[source] = [forcedTarget];
    } else if (targetId) {
      streamState.target[source] = targetId;
    } else {
      if (!streamState.target[source]) {
        streamState.target[source] = [];
      }
      for (const clientId in clientState.client) {
        if (
          clientState.client[clientId].stream &&
          !streamState.target[source].includes(clientId)
        ) {
          streamState.target[source].push(clientId);
        }
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

    // targetId が1件だけならその端末を強制宛先にする。
    // scenario などからは forcedTarget で明示的に指定できる。
    const resolvedTarget =
      forcedTarget ??
      (targetId !== undefined && targetId.length === 1
        ? targetId[0]
        : undefined);
    execStream(
      source,
      from ?? undefined,
      undefined,
      index,
      resolvedTarget,
    );
    voiceEmit(source, id);
  }
};
