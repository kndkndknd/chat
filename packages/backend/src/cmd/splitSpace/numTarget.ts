import { cmdList, streamList } from "../../states";
import { cmdEmit } from "../cmdEmit";
import { recordEmit } from "../../stream/recordEmit";
import { sinewaveEmit } from "../sinewaveEmit";
import { streamEmit } from "../../stream/streamEmit";
import { parameterChange } from "../parameterChange";
import { millisecondsPerBar } from "../bpmCalc";
import { notTargetEmit } from "../notTargetEmit";
import { stringEmit } from "../../socket/ioEmit";
import { chatPreparation } from "../../stream/chatPreparation";
// import { quantizeCmd } from "../../stream/quantize";
import { splitQuantize } from "../splitSpace/splitQuantize";

export const numTarget = (
  stringArr: Array<string>,
  arrTypeArr: Array<string>,
  io,
  state
) => {
  console.log("num target: ", stringArr);
  // 送信先を指定したコマンド/SINEWAVE
  // 20230923 sinewave modeの動作を記載
  const target = Object.keys(state.client)[Number(stringArr[0])];
  console.log(state.client);
  console.log(target);
  if (
    arrTypeArr[1] === "string" &&
    Object.keys(cmdList).includes(stringArr[1])
  ) {
    const cmd = cmdList[stringArr[1]];
    console.log("currend cmd", state.current.cmd[stringArr[1]]);
    const flag = !state.current.cmd[cmd].includes(target);
    cmdEmit(stringArr[1], io, state, target, flag);
  } else if (
    arrTypeArr[1] === "string" &&
    (streamList.includes(stringArr[1]) || stringArr[1] === "CHAT")
  ) {
    console.log("target stream");
    state.stream.target[stringArr[1]] = [target];
    console.log(
      `set ${stringArr[1]} stream`,
      state.stream.target[stringArr[1]]
    );
    if (stringArr[1] === "CHAT") {
      chatPreparation(io, state);
    } else {
      streamEmit(stringArr[1], io, state, target);
    }
  } else if (stringArr[1] === "RECORD" || stringArr[1] === "REC") {
    recordEmit(io, state, target);
  } else if (arrTypeArr[1] === "number") {
    sinewaveEmit(Number(stringArr[1]), io, state, target);
  } else if (stringArr[1] === "VOICE") {
    // console.log("VOICE", target);
    if (stringArr.length === 2) {
      parameterChange("VOICE", io, state, { source: target });
    } else {
      if (
        stringArr[2] === "ON" ||
        stringArr[2] === "TRUE" ||
        stringArr[2] === "ENABLE"
      ) {
        parameterChange("VOICE", io, state, { source: target, value: 1 });
      } else {
        parameterChange("VOICE", io, state, { source: target, value: 0 });
      }
    }
  } else if (stringArr[1] === "QUANTIZE") {
    splitQuantize(io, state, stringArr.slice(1), arrTypeArr.slice(1), target);
  } else {
    stringEmit(io, "not cmd", true, target);
  }
  notTargetEmit(target, Object.keys(state.client), io);
};
