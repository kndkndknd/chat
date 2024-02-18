import { cmdList, streamList } from "../../states.js";
import { cmdEmit } from "../cmdEmit.js";
import { recordEmit } from "../../stream/recordEmit.js";
import { sinewaveEmit } from "../sinewaveEmit.js";
import { streamEmit } from "../../stream/streamEmit.js";

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
  console.log(state.sinewaveClient);
  console.log(target);
  if (
    arrTypeArr[1] === "string" &&
    Object.keys(cmdList).includes(stringArr[1])
  ) {
    cmdEmit(stringArr[1], io, state, target);
  } else if (arrTypeArr[1] === "string" && streamList.includes(stringArr[1])) {
    console.log("target stream");
    streamEmit(stringArr[1], io, state, target);
  } else if (stringArr[1] === "RECORD" || stringArr[1] === "REC") {
    recordEmit(io, state, target);
  } else if (arrTypeArr[1] === "number") {
    sinewaveEmit(Number(stringArr[1]), io, state, target);
  }
};
