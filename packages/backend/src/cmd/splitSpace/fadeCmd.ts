import SocketIO from "socket.io";
import { cmdStateType, CmdType } from "../../types/global";
import { cmdList } from "../../states";
import { stringEmit } from "../../socket/ioEmit";
import { pickupCmdTarget } from "../pickupCmdTarget";
import { putCmd } from "../putCmd";

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
