import { states } from "../states";
import { voiceEmit } from "../cmd/voiceEmit";
import { splitTimerCmd } from "./splitTimerCmd";
import SocketIO from "socket.io";
import { cmdStateType } from "../../../types/global";

export const scheduleSplitCmd = async (
  stringArr: string[],
  source: string,
  io: SocketIO.Server
) => {
  voiceEmit(io, stringArr.join(" "), source, states);

  let timeStampArr = stringArr[0].split(":");
  if (
    timeStampArr.every((item) => {
      return !isNaN(Number(item));
    })
  ) {
    splitTimerCmd(io, states, stringArr, timeStampArr);
  }
};
