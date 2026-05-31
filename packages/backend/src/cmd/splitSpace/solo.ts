import { ioState } from "../../state/states/ioState";
import {
  currentState,
  previousState,
  clientState,
  cmdState,
} from "../../state";
import { cmdList, streamList } from "../../data";

export const solo = (stringArr: string[], arrTypeArr: string[]) => {
  if (Object.keys(cmdList).includes(stringArr[0])) {
    // コマンドソロ
    previousState.text = stringArr.join(" ");
    previousState.stream = currentState.stream;
    previousState.cmd = currentState.cmd;
    previousState.sinewave = currentState.sinewave;
    previousState.RECORD = currentState.RECORD;

    const cmd = cmdList[stringArr[0]];
    // 歯抜けがあっても安全なように、現存する index の配列からランダム選択する
    const indices = Object.keys(clientState.client).map(
      (id) => clientState.client[id].index
    );
    const pickedIndex = indices[Math.floor(Math.random() * indices.length)];
    const fallbackTarget = Object.keys(clientState.client).find(
      (id) => clientState.client[id].index === pickedIndex
    );
    const soloTarget =
      currentState.cmd[cmd].length > 0
        ? currentState.cmd[cmd][
            Math.floor(Math.random() * currentState.cmd[cmd].length)
          ]
        : fallbackTarget;
    for (let stream in currentState.stream) {
      currentState.stream[stream] = false;
    }
    for (let currendCmd in currentState.cmd) {
      if (currendCmd === cmd) {
        currentState.cmd[currendCmd] = [soloTarget];
      } else {
        currentState.cmd[currendCmd] = [];
      }
    }
    ioState?.io.to(soloTarget).emit("cmdFromServer", {
      cmd: cmd,
      flag: true,
      gain: cmdState.GAIN[cmd],
      solo: true,
    });
    console.log("solo: コマンドソロ", cmd, soloTarget);
  } else if (streamList.includes(stringArr[0])) {
    // STREAMソロ
  } else if (arrTypeArr[0] === "number") {
    // サイン波ソロ
  } else {
    console.log("solo: そのコマンドは存在しません");
  }
};
