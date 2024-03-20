import {
  cmdList,
  streamList,
  // parameterList,
  states,
  streams,
} from "../../states";
import { cmdStateType } from "../../types/global";

export const solo = (
  stringArr: string[],
  arrTypeArr: string[],
  state: cmdStateType,
  io
) => {
  if (Object.keys(cmdList).includes(stringArr[0])) {
    // コマンドソロ
    state.previous = { text: stringArr.join(" "), ...state.current };

    const cmd = cmdList[stringArr[0]];
    const soloTarget =
      states.current.cmd[cmd].length > 0
        ? states.current.cmd[cmd][
            Math.floor(Math.random() * states.current.cmd[cmd].length)
          ]
        : states.client[Math.floor(Math.random() * states.client.length)];
    for (let stream in states.current.stream) {
      states.current.stream[stream] = false;
    }
    for (let currendCmd in states.current.cmd) {
      if (currendCmd === cmd) {
        states.current.cmd[currendCmd] = [soloTarget];
      } else {
        states.current.cmd[currendCmd] = [];
      }
    }
    io.to(soloTarget).emit("cmdFromServer", {
      cmd: cmd,
      flag: true,
      gain: states.cmd.GAIN[cmd],
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
