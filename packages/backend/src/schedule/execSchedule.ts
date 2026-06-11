import { ioState } from "../state/states/ioState";
import { receiveEnter } from "../cmd/receiveEnter";
import { stopEmit } from "../cmd/stopEmit";
import { clientState, currentState } from "../state";

export const execSchedule = (cmdString) => {
  // 歯抜けがあっても安全なように、現存する index の配列からランダム選択する
  const indices = Object.keys(clientState.client).map(
    (id) => clientState.client[id].index
  );
  const pickedIndex = indices[Math.floor(Math.random() * indices.length)];
  const targetId = Object.keys(clientState.client).find(
    (id) => clientState.client[id].index === pickedIndex
  );
  const stringArr = cmdString.split(" ");
  if (
    Object.keys(currentState.cmd).includes(stringArr[stringArr.length - 1]) ||
    Object.keys(currentState.stream).includes(
      stringArr[stringArr.length - 1]
    ) ||
    /^([1-9]\d*|0)(\.\d+)?$/.test(stringArr[stringArr.length - 1])
  ) {
    receiveEnter(cmdString, targetId);
  } else if (stringArr[0] === "STOP") {
    if (stringArr.length === 1) {
      console.log("stoop", stringArr);
      // const client = "all";
      stopEmit("", "ALL");
    }
  } else {
    ioState?.io.emit("stringsFromServer", {
      strings: cmdString,
      timeout: false,
    });
  }
};
