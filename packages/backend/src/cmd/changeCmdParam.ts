import { sinewaveChange } from "./sinewaveChange";
import { parameterChange } from "../parameterChange";

import { flagState, clientState } from "../state";
import { parameterList } from "../data";
import { broadcastEmit } from "../webSocket";
import { paramsSocketType } from "../../../../types";

export const changeCmdParam = async (
  strings: string,
  id: string,
): Promise<void> => {
  if (strings === "TWICE" || strings === "HALF") {
    if (!clientState.client[id].self) {
      sinewaveChange(strings);
    } else {
      sinewaveChange(strings, { id });
    }
  } else if (Object.keys(parameterList).includes(strings)) {
    parameterChange(parameterList[strings], { source: id });
  } else if (strings === "FUSEJI" || strings === "EMOJI") {
    flagState.emoji = !flagState.emoji;
    const data: paramsSocketType = {
      type: "params",
      payload: {
        type: "emoji",
        state: flagState.emoji,
      },
    };
    broadcastEmit(data);
    // io.emit("emojiFromServer", {
    //   state: flagState.emoji,
    //   text: "Emoji " + flagState.emoji,
    // });
  }
};
