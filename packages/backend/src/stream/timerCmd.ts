import { receiveEnter } from "../cmd/receiveEnter";
import { stopEmit } from "../cmd/stopEmit";
import { clientState, currentState } from "../state";
import { ioState } from "../state/states/ioState";

export const timerCmd = (
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
  ioState?.io.emit("stringsFromServer", {
    strings: string,
    timeout: true,
  });
  console.log(string);

  if (timerVal > 0) {
    setTimeout(() => {
      const targetId = Object.keys(clientState.client)[
        Math.floor(Math.random() * Object.keys(clientState.client).length)
      ];
      if (
        Object.keys(currentState.cmd).includes(
          stringArr[stringArr.length - 1]
        ) ||
        Object.keys(currentState.stream).includes(
          stringArr[stringArr.length - 1]
        )
      ) {
        receiveEnter(cmdString, targetId);
      } else if (stringArr[1] === "STOP") {
        if (stringArr.length === 2) {
          const client = "all";
          stopEmit("", "ALL", client);
          /*
        } else if(stringArr.length === 3) {
          if(stringArr[2] === 'SINEWAVECLIENT') {
            stopEmit(io, state, 'all', 'sinewaveClient');
          } else if(stringArr[2] === 'CLIENT') {
            stopEmit(io, state, 'all', 'client');
          } else if(stringArr[2] === 'ALL') {
            stopEmit(io, state, 'all', 'all');
          }
          */
        }
      } else {
        ioState?.io.emit("stringsFromServer", {
          strings: cmdString,
          timeout: false,
        });
      }
    }, timerVal);
  }
};
