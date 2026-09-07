import { clientState, currentState, streamState } from "../../state";
import { cmdList, streamList } from "../../data";
import { execCmd } from "../execCmd";
import { recordEmit } from "../../stream/recordEmit";
import { execSinewave } from "../execSinewave";
import { execStream } from "../../stream/execStream";
import { parameterChange } from "../../parameterChange";
import { notTargetEmit } from "../notTargetEmit";
import { stringEmit } from "../../socket/ioEmit";
import { chatPreparation } from "../../stream/chatPreparation";
import { splitQuantize } from "./splitQuantize";
import { numPaSwitch } from "./numPaSwitch";
import { pickupPaCmdTarget } from "../pickupCmdTarget";



export const splitPaTarget = (
  stringArr: Array<string>,
  arrTypeArr: Array<string>,
) => {
  if(Object.keys(cmdList).includes(stringArr[1])) {
    const cmd = cmdList[stringArr[1]];
    const targetArr = pickupPaCmdTarget(cmd)
    const target = targetArr[Math.floor(Math.random() * targetArr.length)]
    if(clientState.paCmdClient.includes(target)) {
    const flag = !currentState.cmd[cmd].includes[target]
    execCmd(cmd, target, flag)

    } else {
      stringEmit("target is not PA client")
    }
  } else if (arrTypeArr[1] === "number") {
    const cmd = "SINEWAVE";
    const targetArr = pickupPaCmdTarget(cmd)
    const target = targetArr[Math.floor(Math.random() * targetArr.length)]
    if(clientState.paCmdClient.includes(target)) {
    execSinewave(Number(stringArr[1]), target)
    } else {
      stringEmit("target is not PA client")
    }
  } else if (streamList.includes(stringArr[1])) {
    streamState.pa[stringArr[1]] = true
    execStream(stringArr[1])
  } else if (stringArr[1] === "CHAT") {
    streamState.pa.CHAT = true;
    chatPreparation();
  }
};

