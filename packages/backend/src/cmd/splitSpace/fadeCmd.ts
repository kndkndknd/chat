import SocketIO from "socket.io";
import { CmdType } from "../../../../types/global";
import { cmdList, cmdState, currentState } from "../../states";
import { stringEmit } from "../../socket/ioEmit";
import { pickupCmdTarget } from "../pickupCmdTarget";
import { putCmd } from "../putCmd";

export const fadeCmd = (
  stringArr: string[],
  arrTypeArr: string[],
  io: SocketIO.Server,
  fadeSec?: number
) => {
  if (Object.keys(cmdList).includes(stringArr[1])) {
    const cmdString = stringArr[1];
    const targetIdArr = pickupCmdTarget(cmdList[cmdString]);
    const cmd: CmdType = {
      cmd: cmdList[cmdString],
      gain: cmdState.GAIN[cmdList[cmdString]],
    };
    if (
      currentState.cmd[cmd.cmd].filter((id) => targetIdArr.includes[id])
        .length > 0
    ) {
      cmd.flag = false;
      cmd.fade =
        fadeSec !== undefined
          ? fadeSec
          : cmdState.FADE.OUT > 0
          ? cmdState.FADE.OUT
          : 5;
    } else {
      cmd.flag = true;
      cmd.fade =
        fadeSec !== undefined
          ? fadeSec
          : cmdState.FADE.IN > 0
          ? cmdState.FADE.IN
          : 5;
    }
    putCmd(io, targetIdArr, cmd);
  } else if (
    (stringArr[1] === "IN" || stringArr[1] === "OUT") &&
    stringArr.length === 2
  ) {
    console.log("fade", stringArr);
    if (cmdState.FADE[stringArr[1]] === 0) {
      cmdState.FADE[stringArr[1]] = 5;
    } else {
      cmdState.FADE[stringArr[1]] = 0;
    }
    // io.emit('stringsFromServer',{strings: 'FADE ' + stringArr[1] +  ': ' + String(cmdState.FADE[stringArr[1]]), timeout: true})
    stringEmit(
      io,
      "FADE " + stringArr[1] + ": " + String(cmdState.FADE[stringArr[1]])
      // state
    );
  } else if (
    stringArr.length === 3 &&
    (stringArr[1] === "IN" || stringArr[1] === "OUT") &&
    arrTypeArr[2] === "number"
  ) {
    if (cmdState.FADE[stringArr[1]] !== Number(stringArr[2])) {
      cmdState.FADE[stringArr[1]] = Number(stringArr[2]);
    } else {
      cmdState.FADE[stringArr[1]] = 0;
    }
    stringEmit(
      io,
      "FADE " + stringArr[1] + ": " + String(cmdState.FADE[stringArr[1]])
      // state
    );
  } else if (stringArr[1] === "OFF") {
    if (stringArr.length === 2) {
      cmdState.FADE.IN = 0;
      cmdState.FADE.OUT = 0;
      stringEmit(
        io,
        "FADE IN/OUT: OFF"
        // state
      );
    } else {
      stringArr[2] === "IN" ? (cmdState.FADE.IN = 0) : (cmdState.FADE.OUT = 0);
      stringEmit(io, "FADE " + stringArr[2] + ": OFF");
      // state
    }
  } else {
    // stringEmit(io, `${cmdString} is not cmd`);
  }
};
