import SocketIO from "socket.io";
import { cmdStateType } from "../../../types/global";
import { execSchedule } from "./execSchedule";

// exec 'HH:MM:SS cmd' or 'MM:SS cmd' from splitSpace.ts
export const splitTimerCmd = (
  io: SocketIO.Server,
  state: cmdStateType,
  stringArr: string[],
  timeStampArr: string[]
) => {
  let dt = new Date();
  let y = String(dt.getFullYear());
  let m =
    dt.getMonth() < 9
      ? "0" + String(dt.getMonth() + 1)
      : String(dt.getMonth() + 1);
  let d = dt.getDate() < 10 ? "0" + String(dt.getDate()) : String(dt.getDate());
  let today = y + "-" + m + "-" + d;
  let now = Date.now();
  console.log(today);
  let timerVal = 0;
  if (timeStampArr.length === 3) {
    timerVal = Date.parse(today + "T" + stringArr[0] + "+09:00") - now;
  } else if (timeStampArr.length === 2) {
    timerVal = Date.parse(today + "T" + stringArr[0] + ":00+09:00") - now;
  }
  const cmdString =
    stringArr.length > 2 ? stringArr.slice(1).join(" ") : stringArr[1];
  const string = cmdString + " SCHEDULED " + String(timerVal) + "ms LATER";
  io.emit("stringsFromServer", {
    strings: string,
    timeout: true,
  });
  console.log(string);

  if (timerVal > 0 && timerVal < 10800000) {
    console.log("absolute time", timerVal);
    setTimeout(() => {
      execSchedule(io, cmdString);
    }, timerVal);
  } else {
    const timerValue =
      timeStampArr.length === 2
        ? (Number(timeStampArr[0]) * 60 + Number(timeStampArr[1])) * 1000
        : (Number(timeStampArr[0]) * 60 * 60 +
            Number(timeStampArr[1]) * 60 +
            Number(timeStampArr[2])) *
          1000;
    console.log("relative time", timerValue);
    setTimeout(() => {
      execSchedule(io, cmdString);
    }, timerValue);
  }
};
