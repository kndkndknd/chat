import SocketIO from "socket.io";
import { cmdStateType, CmdType } from "../../types/global";
import { cmdList } from "../../states";
import { stringEmit } from "../../socket/ioEmit";
import { pickupCmdTarget } from "../pickupCmdTarget";
import { putCmd } from "../putCmd";

export const fadeCmd = (
  stringArr: string[],
  arrTypeArr: string[],
  io: SocketIO.Server,
  state: cmdStateType,
  fadeSec?: number
) => {
  if (Object.keys(cmdList).includes(stringArr[1])) {
    const cmdString = stringArr[1]
    const targetIdArr = pickupCmdTarget(state, cmdList[cmdString]);
    const cmd: CmdType = {
      cmd: cmdList[cmdString],
      gain: state.cmd.GAIN[cmdList[cmdString]],
    };
    if (
      state.current.cmd[cmd.cmd].filter((id) => targetIdArr.includes[id])
        .length > 0
    ) {
      cmd.flag = false;
      cmd.fade =
        fadeSec !== undefined
          ? fadeSec
          : state.cmd.FADE.OUT > 0
          ? state.cmd.FADE.OUT
          : 5;
    } else {
      cmd.flag = true;
      cmd.fade =
        fadeSec !== undefined
          ? fadeSec
          : state.cmd.FADE.IN > 0
          ? state.cmd.FADE.IN
          : 5;
    }
    putCmd(io, targetIdArr, cmd, state);
  } else if ((stringArr[1] === "IN" || stringArr[1] === "OUT") && stringArr.length === 2 ) {

      console.log('fade', stringArr)
      if (state.cmd.FADE[stringArr[1]] === 0) {
        state.cmd.FADE[stringArr[1]] = 5;
      } else {
        state.cmd.FADE[stringArr[1]] = 0;
      }
      // io.emit('stringsFromServer',{strings: 'FADE ' + stringArr[1] +  ': ' + String(state.cmd.FADE[stringArr[1]]), timeout: true})
      stringEmit(
        io,
        "FADE " + stringArr[1] + ": " + String(state.cmd.FADE[stringArr[1]])
        // state
      );
  } else if (
    stringArr.length === 3 &&
    (stringArr[1] === "IN" || stringArr[1] === "OUT") &&
    arrTypeArr[2] === "number"
  ) {
      if (state.cmd.FADE[stringArr[1]] !== Number(stringArr[2])) {
        state.cmd.FADE[stringArr[1]] = Number(stringArr[2]);
      } else {
        state.cmd.FADE[stringArr[1]] = 0;
      }
      stringEmit(
        io,
        "FADE " + stringArr[1] + ": " + String(state.cmd.FADE[stringArr[1]])
        // state
      );
  } else {
    // stringEmit(io, `${cmdString} is not cmd`);
  }
};
