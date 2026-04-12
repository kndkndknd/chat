import { clientState, currentState, streamState } from "../../state";
import { cmdList, streamList } from "../../data";
import { cmdEmit } from "../cmdEmit";
import { sinewaveEmit } from "../sinewaveEmit";
import { emitStream } from "../../stream/emitStream";
import { stringEmit } from "../../socket/ioEmit";
import { emitChatReq } from "../../stream/chat/emitChatReq";
import { pickupTarget } from "../../clientProcess/pickupTarget";


export const splitPaTarget = (
  stringArr: Array<string>,
  arrTypeArr: Array<string>,
) => {
  if (Object.keys(cmdList).includes(stringArr[1])) {
    const cmd = cmdList[stringArr[1]];
    const targetArr = pickupTarget(cmd, "CMD", { pa: true });
    const target = targetArr[Math.floor(Math.random() * targetArr.length)];
    if (clientState.paCmdClient.includes(target)) {
      const flag = !currentState.cmd[cmd].includes[target];
      cmdEmit(cmd, target, flag);
    } else {
      stringEmit("target is not PA client");
    }
  } else if (arrTypeArr[1] === "number") {
    const cmd = "SINEWAVE";
    const targetArr = pickupTarget(cmd, "CMD", { pa: true });
    const target = targetArr[Math.floor(Math.random() * targetArr.length)];
    if (clientState.paCmdClient.includes(target)) {
      sinewaveEmit(Number(stringArr[1]), target);
    } else {
      stringEmit("target is not PA client");
    }
  } else if (streamList.includes(stringArr[1])) {
    streamState.pa[stringArr[1]] = true;
    emitStream(stringArr[1]);
  } else if (stringArr[1] === "CHAT") {
    streamState.pa.CHAT = true;
    emitChatReq();
  }
};
