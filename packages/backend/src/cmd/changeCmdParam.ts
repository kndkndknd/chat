import SocketIO from "socket.io";
import { sinewaveChange } from "./sinewaveChange";
import { parameterChange } from "../parameterChange";

import { flagState } from "../state";
import { parameterList } from "../data";

export const changeCmdParam = async (
  strings: string,
  id: string,
  io: SocketIO.Server
): Promise<void> => {
  if (strings === "TWICE" || strings === "HALF") {
    sinewaveChange(strings, io);
  } else if (Object.keys(parameterList).includes(strings)) {
    parameterChange(parameterList[strings], io, { source: id });
  } else if (strings === "FUSEJI" || strings === "EMOJI") {
    flagState.emoji = !flagState.emoji;
    io.emit("emojiFromServer", {
      state: flagState.emoji,
      text: "Emoji " + flagState.emoji,
    });
  }
};
