import { sinewaveChange } from "./sinewaveChange";
import { parameterChange } from "../parameterChange";
import { ioState } from "../state/states/ioState";
import { flagState, clientState } from "../state";
import { parameterList } from "../data";

export const changeCmdParam = async (
  strings: string,
  id: string,
): Promise<void> => {
  if (strings === "TWICE" || strings === "HALF") {
    // if (!clientState.client[id].self) {
      sinewaveChange(strings);
    // } else {
    //   sinewaveChange(strings, { id });
    // }
  } else if (Object.keys(parameterList).includes(strings)) {
    parameterChange(parameterList[strings], { source: id });
  } else if (strings === "FUSEJI" || strings === "EMOJI") {
    flagState.emoji = !flagState.emoji;
    ioState?.io.emit("emojiFromServer", {
      state: flagState.emoji,
      text: "Emoji " + flagState.emoji,
    });
  }
};
