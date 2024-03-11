import {
  cmdList,
  streamList,
  parameterList,
  states,
  streams,
} from "../../states";

export const solo = (
  stringArr: string[],
  arrTypeArr: string[],
  state: cmdStateType,
  io
) => {
  if (Object.keys(cmdList).includes(stringArr[0])) {
    // コマンドソロ
    const cmd = cmdList[stringArr[0]];
    const soloTarget =
      states.current.cmd[cmd].length > 0
        ? states.current.cmd[cmd][
            Math.floor(Math.random() * states.current.cmd[cmd].length)
          ]
        : states.client[Math.floor(Math.random() * states.client.length)];
  } else if (streamList.includes(stringArr[0])) {
    // STREAMソロ
  } else if (arrTypeArr[0] === "number") {
    // サイン波ソロ
  } else {
    console.log("solo: そのコマンドは存在しません");
  }
};
