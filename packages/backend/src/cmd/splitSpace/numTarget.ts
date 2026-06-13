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
  targetArr: Array<string>,
  stringArr: Array<string>,
  arrTypeArr: Array<string>,
) => {
  console.log("num target: ", stringArr);
  // 送信先を指定したコマンド/SINEWAVE
  // 20230923 sinewave modeの動作を記載
  // const target = Object.keys(clientState.client)[Number(stringArr[0])];

  if (
    arrTypeArr[0] === "string" &&
    Object.keys(cmdList).includes(stringArr[0])
  ) {
    for (const target of targetArr) {
      if (clientState.cmdClient.includes(target)) {
        const cmd = cmdList[stringArr[0]];
        console.log("currend cmd", currentState.cmd[stringArr[0]]);
        const flag = !currentState.cmd[cmd].includes(target);
        cmdEmit(stringArr[0], target, flag);
      } else {
        stringEmit("target is not cmd client", true, target);
      }
    }
  } else if (
    arrTypeArr[0] === "string" &&
    (streamList.includes(stringArr[0]) || stringArr[0] === "CHAT")
  ) {
    console.log("target stream");
    execStream(stringArr[0], undefined, undefined, undefined, targetArr);
    // streamState.target[stringArr[0]] = [target];
    // console.log(`set ${stringArr[0]} stream`, streamState.target[stringArr[0]]);
    // if (stringArr[1] === "CHAT") {
    //   chatPreparation();
    // } else {
    //   streamEmit(stringArr[1], undefined, undefined, undefined, target);
    // }
  } else if (stringArr[0] === "RECORD" || stringArr[0] === "REC") {
    for (const target of targetArr) {
      recordEmit(target);
    }
  } else if (arrTypeArr[0] === "number") {
    for (const target of targetArr) {
      sinewaveEmit(Number(stringArr[1]), target);
    }
  } else if (stringArr[0] === "VOICE") {
    // console.log("VOICE", target);
    if (stringArr.length === 1) {
      for (const target of targetArr) {
        parameterChange("VOICE", { source: target });
      }
    } else {
      if (
        stringArr[1] === "ON" ||
        stringArr[1] === "TRUE" ||
        stringArr[1] === "ENABLE"
      ) {
        for (const target of targetArr) {
          parameterChange("VOICE", { source: target, value: 1 });
        }
      } else {
        for (const target of targetArr) {
          parameterChange("VOICE", { source: target, value: 0 });
        }
      }
    }
  } else if (stringArr[0] === "QUANTIZE") {
    splitQuantize(stringArr.slice(1), targetArr);
    // if (quantizeObj === "quantize failed") {
    //   stringEmit(io, "quantize failed", true, target);
    // } else {
    // }
  } else if (stringArr[0] === "PA") {
    for (const target of targetArr) {
      numPaSwitch(target);
    }
  } else if (stringArr[0] === "GPS") {
    for (const target of targetArr) {
      ioState?.io.to(target).emit("gpsFlagFromServer");
    }
  } else if (stringArr[0] === "ACCELARATE") {
    for (const target of targetArr) {
      ioState?.io.to(target).emit("accelarateFlagFromServer");
    }
  } else {
    for (const target of targetArr) {
    stringEmit("not cmd", true, target);
    }
  }
  notTargetEmit(targetArr, Object.keys(clientState.client));

};
