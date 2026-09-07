import { receiveEnter } from "../cmd/receiveEnter";
import { stopEmit, stringEmit } from "../socket/ioEmit";
import { clientState, currentState } from "../state";

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
  stringEmit(string, true)
  console.log(string);

  if (timerVal > 0) {
    setTimeout(() => {
      // 歯抜けがあっても安全なように、現存する index の配列からランダム選択する
      const indices = Object.keys(clientState.client).map(
        (id) => clientState.client[id].index
      );
      const pickedIndex = indices[Math.floor(Math.random() * indices.length)];
      const targetId = Object.keys(clientState.client).find(
        (id) => clientState.client[id].index === pickedIndex
      );
      if (
        Object.keys(currentState.cmd).includes(
          stringArr[stringArr.length - 1]
        ) ||
        Object.keys(currentState.stream).includes(
          stringArr[stringArr.length - 1]
        )
      ) {
        receiveEnter(cmdString, targetId as string);
      } else if (stringArr[1] === "STOP") {
        if (stringArr.length === 2) {
          const client = "all";
          stopEmit({ fadeOutVal: 0, target: "ALL", group: client });
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
        stringEmit(cmdString, false)
      }
    }, timerVal);
  }
};
