import { CmdOptionType } from "../../../../../types";
import { cmdList } from "../../data";
import { cmdState, currentState } from "../../state";

import { stringEmit } from "../../socket/ioEmit";
// import { pickupCmdTarget } from "../pickupCmdTarget";
import { pickupTarget } from "../../clientProcess/pickupTarget";
import { putCmd } from "../cmdEmit";

export const fadeCmd = (
  stringArr: string[],
  arrTypeArr: string[],
  fadeSec?: number,
) => {
  if (Object.keys(cmdList).includes(stringArr[1])) {
    const cmdString = stringArr[1];
    const targetIdArr = pickupTarget(cmdList[cmdString], "CMD");
    const cmd: string = cmdList[cmdString];
    const cmdOption: CmdOptionType = {
      gain: cmdState.GAIN[cmdList[cmdString]],
    };
    if (
      currentState.cmd[cmd].filter((id) => targetIdArr.includes[id]).length > 0
    ) {
      cmdOption.flag = false;
      cmdOption.fade =
        fadeSec !== undefined
          ? fadeSec
          : cmdState.FADE.OUT > 0
            ? cmdState.FADE.OUT
            : 5;
    } else {
      cmdOption.flag = true;
      cmdOption.fade =
        fadeSec !== undefined
          ? fadeSec
          : cmdState.FADE.IN > 0
            ? cmdState.FADE.IN
            : 5;
    }
    putCmd(targetIdArr, { cmd, option: cmdOption });
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
      "FADE " + stringArr[1] + ": " + String(cmdState.FADE[stringArr[1]]),
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
      "FADE " + stringArr[1] + ": " + String(cmdState.FADE[stringArr[1]]),
      // state
    );
  } else if (stringArr[1] === "OFF") {
    if (stringArr.length === 2) {
      cmdState.FADE.IN = 0;
      cmdState.FADE.OUT = 0;
      stringEmit(
        "FADE IN/OUT: OFF",
        // state
      );
    } else {
      stringArr[2] === "IN" ? (cmdState.FADE.IN = 0) : (cmdState.FADE.OUT = 0);
      stringEmit("FADE " + stringArr[2] + ": OFF");
      // state
    }
  } else {
    // stringEmit(io, `${cmdString} is not cmd`);
  }
};
