import {
  currentState,
  previousState,
  clientState,
  cmdState,
} from "../../state";
import { cmdList, streamList } from "../../data";
import { putCmd } from "../cmdEmit";

export const solo = (stringArr: string[], arrTypeArr: string[]) => {
  if (Object.keys(cmdList).includes(stringArr[0])) {
    // コマンドソロ
    previousState.text = stringArr.join(" ");
    previousState.stream = currentState.stream;
    previousState.cmd = currentState.cmd;
    previousState.sinewave = currentState.sinewave;
    previousState.RECORD = currentState.RECORD;

    const cmd = cmdList[stringArr[0]];
    const soloTarget =
      currentState.cmd[cmd].length > 0
        ? currentState.cmd[cmd][
            Math.floor(Math.random() * currentState.cmd[cmd].length)
          ]
        : Object.keys(clientState.client)[
            Math.floor(Math.random() * Object.keys(clientState.client).length)
          ];
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
    putCmd([soloTarget], {
      cmd: cmd,
      option: { flag: true, gain: cmdState.GAIN[cmd], solo: true },
    });
    // io.to(soloTarget).emit("cmdFromServer", {
    //   cmd: cmd,
    //   flag: true,
    //   gain: cmdState.GAIN[cmd],
    //   solo: true,
    // });
    console.log("solo: コマンドソロ", cmd, soloTarget);
  } else if (streamList.includes(stringArr[0])) {
    // STREAMソロ
  } else if (arrTypeArr[0] === "number") {
    // サイン波ソロ
  } else {
    console.log("solo: そのコマンドは存在しません");
  }
};
