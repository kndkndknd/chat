import SocketIO from "socket.io";
import { cmdStateType, CmdType } from "../../types/global.js";
import { cmdList } from "../../states.js";
import { stringEmit } from "../../socket/ioEmit.js";
import { pickupCmdTarget } from "../pickupCmdTarget.js";
import { putCmd } from "../putCmd.js";

export const fadeCmd = (
  cmdString: string,
  io: SocketIO.Server,
  state: cmdStateType,
  fadeSec?: number
) => {
  if (Object.keys(cmdList).includes(cmdString)) {
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
  } else {
    stringEmit(io, `${cmdString} is not cmd`);
  }
};
