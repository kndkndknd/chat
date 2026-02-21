import SocketIO from "socket.io";
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
import { pickupPaCmdTarget } from "../pickupCmdTarget";



export const splitPaTarget = (
  stringArr: Array<string>,
  arrTypeArr: Array<string>,
  io: SocketIO.Server,
) => {
  if(Object.keys(cmdList).includes(stringArr[1])) {
    const cmd = cmdList[stringArr[1]];
    const targetArr = pickupPaCmdTarget(cmd)
    const target = targetArr[Math.floor(Math.random() * targetArr.length)]
    if(clientState.paCmdClient.includes(target)) {
    const flag = !currentState.cmd[cmd].includes[target]
    cmdEmit(cmd, io, target, flag)

    } else {
      stringEmit(io, "target is not PA client")
    }
  } else if (arrTypeArr[1] === "number") {
    const cmd = "SINEWAVE";
    const targetArr = pickupPaCmdTarget(cmd)
    const target = targetArr[Math.floor(Math.random() * targetArr.length)]
    if(clientState.paCmdClient.includes(target)) {
    sinewaveEmit(Number(stringArr[1]), io, target)
    } else {
      stringEmit(io, "target is not PA client")
    }
  } else if (streamList.includes(stringArr[1])) {
    streamState.pa[stringArr[1]] = true
    streamEmit(stringArr[1], io)
  } else if (stringArr[1] === "CHAT") {
    streamState.pa.CHAT = true;
    chatPreparation(io);
  }
};

