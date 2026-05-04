import { voiceEmit } from "../cmd/voiceEmit";
import { splitTimerCmd } from "./splitTimerCmd";
import SocketIO from "socket.io";

export const scheduleSplitCmd = async (
  stringArr: string[],
  source: string,
) => {
  voiceEmit(stringArr.join(" "), source);

  let timeStampArr = stringArr[0].split(":");
  if (
    timeStampArr.every((item) => {
      return !isNaN(Number(item));
    })
  ) {
    splitTimerCmd(stringArr, timeStampArr);
  }
};
