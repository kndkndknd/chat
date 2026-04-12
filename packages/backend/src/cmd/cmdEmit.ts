import { clientState, cmdState, currentState, webSocketState, arduinoState } from "../state";
import { cmdList } from "../data";
import { switchOneshot } from "../arduinoAccess/arduinoAccess";

import { stopEmit } from "./stopEmit";
// import { putCmd } from "./putCmd";
import { notTargetEmit } from "./notTargetEmit";
import { previousCmd } from "./previousCmd";
// import { pickupCmdTarget } from "./pickupCmdTarget";
import { pickupTarget } from "../clientProcess/pickupTarget";
// import { getLengthFromBPM } from "../../../util/getLengthFromBPM";
import { metronomeEmit } from "./metronomeEmit";
import { broadcastEmit, targetEmit } from "../webSocket";

export const cmdEmit = (
  cmdStrings: string,
  target?: string,
  flag?: boolean,
) => {
  let targetId = "";
  let cmd = "";
  let option = { flag: flag, fade: 0, gain: 0, solo: false };
  const targetIdArr = target
    ? pickupTarget(cmdStrings, "CMD", { target: target })
    : pickupTarget(cmdStrings, "CMD");

  switch (cmdStrings) {
    case "STOP":
      const client = "all";
      stopEmit("", "ALL", client);
      break;
    case "WHITENOISE":
    case "FEEDBACK":
    case "BASS":
      const cmdKey = cmdStrings as keyof typeof cmdList;
      cmd = cmdList[cmdKey];
      option.gain = cmdState.GAIN[cmdKey];

      if (
        currentState.cmd[cmd].filter((id) => targetIdArr.includes(id)).length >
        0
      ) {
        option.flag = false;
        option.fade = cmdState.FADE.OUT;
        currentState.cmd[cmd]
          .filter((id) => targetIdArr.includes(id))
          .forEach((id) => {
            delete currentState.cmd[cmd][id];
          });
      } else {
        option.flag = true;
        option.fade = cmdState.FADE.IN;
        currentState.cmd[cmd] = [...currentState.cmd[cmd], ...targetIdArr];
        console.log(`current ${cmd}`, currentState.cmd[cmd]);
      }
      if (flag !== undefined) option.flag = flag;

      console.log("flag", flag);
      console.log("cmd", cmd);
      putCmd(targetIdArr, { cmd: cmd, option: option });
      break;
    case "CLICK":
      console.log(cmdState.GAIN.CLICK);
      putCmd(targetIdArr, {
        cmd: "CLICK",
        option: { gain: cmdState.GAIN.CLICK },
      });
      break;
    case "SIMULATE":
      console.log(cmdState.GAIN.SIMULATE);
      putCmd(targetIdArr, {
        cmd: "SIMULATE",
        option: { gain: cmdState.GAIN.SIMULATE },
      });
      // notTargetEmit(targetId, Object.keys(clientState.client), io);
      break;
    case "METRONOME":
      metronomeEmit(cmd, target);
      break;
    case "PREVIOUS":
    case "PREV":
      console.log("previous");
      previousCmd();
      break;
    /*
    case 'RECORD':
      // console.log("debug")
      if(!state.current.RECORD) {
        console.log("debug cmd ts")
        state.current.RECORD = true
        io.emit('recordReqFromServer', {target: 'PLAYBACK', timeout: 10000})
      } else {
        state.current.RECORD = false
      }
      break
      */
  }
  cmdStrings = "";
};


export const putCmd = (
  idArr: Array<string>,
  cmd: {
    cmd: string;
    option?: {
      value?: number;
      flag?: boolean;
      fade?: number;
      portament?: number;
      gain?: number;
      solo?: boolean;
    };
  },
) => {
  idArr.forEach((id) => {
    targetEmit(id, {
      type: "cmd",
      payload: cmd,
    });
    // io.to(id).emit("cmdFromServer", cmd);
    console.log('cmd to',id, cmd);
    if (
      clientState.client[id] !== undefined &&
      clientState.client[id].urlPathName.includes("pi") &&
      arduinoState.connected
    ) {
      let timeout = cmd.cmd === "CLICK" || cmd.cmd === "STOP" ? 100 : 500;
      const result = switchOneshot(timeout);
      console.log("putCmd: switchOneshot", result);
    }
  });
};
