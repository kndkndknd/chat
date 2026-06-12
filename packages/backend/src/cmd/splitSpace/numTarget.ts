import { ioState } from "../../state/states/ioState";
import { clientState, currentState, streamState } from "../../state";
import { cmdList, streamList } from "../../data";
import { cmdEmit } from "../cmdEmit";
import { recordEmit } from "../../stream/recordEmit";
import { sinewaveEmit } from "../sinewaveEmit";
import { streamEmit } from "../../stream/streamEmit";
import { parameterChange } from "../../parameterChange";
import { notTargetEmit } from "../notTargetEmit";
import { stringEmit } from "../../socket/ioEmit";
import { chatPreparation } from "../../stream/chatPreparation";
import { splitQuantize } from "./splitQuantize";
import { numPaSwitch } from "./numPaSwitch";
import { execStream } from "../execStream";

export const numTarget = (
  stringArr: Array<string>,
  arrTypeArr: Array<string>,
) => {
  console.log("num target: ", stringArr);
  // 送信先を指定したコマンド/SINEWAVE
  // 20230923 sinewave modeの動作を記載
  // const target = Object.keys(clientState.client)[Number(stringArr[0])];
  const target = Object.keys(clientState.client).find(
    (key) => clientState.client[key].index === Number(stringArr[0])
  );
  console.log(clientState.client);
  console.log(target);
  if (
    arrTypeArr[1] === "string" &&
    Object.keys(cmdList).includes(stringArr[1])
  ) {
    if (clientState.cmdClient.includes(target)) {
      const cmd = cmdList[stringArr[1]];
      console.log("currend cmd", currentState.cmd[stringArr[1]]);
      const flag = !currentState.cmd[cmd].includes(target);
      cmdEmit(stringArr[1], target, flag);
    } else {
      stringEmit("target is not cmd client", true, target);
    }
  } else if (
    arrTypeArr[1] === "string" &&
    (streamList.includes(stringArr[1]) || stringArr[1] === "CHAT")
  ) {
    console.log("target stream");
    execStream(stringArr[1], undefined, undefined, undefined, [target]);
    // streamState.target[stringArr[1]] = [target];
    // console.log(`set ${stringArr[1]} stream`, streamState.target[stringArr[1]]);
    // if (stringArr[1] === "CHAT") {
    //   chatPreparation();
    // } else {
    //   streamEmit(stringArr[1], undefined, undefined, undefined, target);
    // }
  } else if (stringArr[1] === "RECORD" || stringArr[1] === "REC") {
    recordEmit(target);
  } else if (arrTypeArr[1] === "number") {
    sinewaveEmit(Number(stringArr[1]), target);
  } else if (stringArr[1] === "VOICE") {
    // console.log("VOICE", target);
    if (stringArr.length === 2) {
      parameterChange("VOICE", { source: target });
    } else {
      if (
        stringArr[2] === "ON" ||
        stringArr[2] === "TRUE" ||
        stringArr[2] === "ENABLE"
      ) {
        parameterChange("VOICE", { source: target, value: 1 });
      } else {
        parameterChange("VOICE", { source: target, value: 0 });
      }
    }
  } else if (stringArr[1] === "QUANTIZE") {
    splitQuantize(stringArr.slice(2), target);
    // if (quantizeObj === "quantize failed") {
    //   stringEmit(io, "quantize failed", true, target);
    // } else {
    // }
  } else if (stringArr[1] === "PA") {
    numPaSwitch(target);
  } else if (stringArr[1] === "GPS") {
    ioState?.io.to(target).emit("gpsFlagFromServer");
  } else if (stringArr[1] === "ACCELARATE") {
    ioState?.io.emit("accelarateFlagFromServer");
  } else {
    stringEmit("not cmd", true, target);
  }
  notTargetEmit(target, Object.keys(clientState.client));
};
