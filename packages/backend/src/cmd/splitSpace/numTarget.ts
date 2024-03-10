import { cmdList, streamList } from "../../states";
import { cmdEmit } from "../cmdEmit";
import { recordEmit } from "../../stream/recordEmit";
import { sinewaveEmit } from "../sinewaveEmit";
import { streamEmit } from "../../stream/streamEmit";

export const numTarget = (
  stringArr: Array<string>,
  arrTypeArr: Array<string>,
  io,
  state
) => {
  console.log(stringArr);
  // 送信先を指定したコマンド/SINEWAVE
  // 20230923 sinewave modeの動作を記載
  const target = state.client[Number(stringArr[0])];
  console.log(state.client);
  console.log(target);
  if (
    arrTypeArr[1] === "string" &&
    Object.keys(cmdList).includes(stringArr[1])
  ) {
    console.log("currend cmd", state.current.cmd[stringArr[1]]);
    const flag = !state.current.cmd[stringArr[1]].includes(target);
    cmdEmit(stringArr[1], io, state, target, flag);
  } else if (arrTypeArr[1] === "string" && streamList.includes(stringArr[1])) {
    console.log("target stream");
    streamEmit(stringArr[1], io, state, target);
  } else if (stringArr[1] === "RECORD" || stringArr[1] === "REC") {
    recordEmit(io, state, target);
  } else if (arrTypeArr[1] === "number") {
    sinewaveEmit(Number(stringArr[1]), io, state, target);
  }
};
