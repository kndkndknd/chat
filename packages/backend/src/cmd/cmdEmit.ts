import { clientState, cmdState, currentState } from "../state";
import { cmdList } from "../data";

import { stopEmit } from "./stopEmit";
import { putCmd } from "./putCmd";
import { notTargetEmit } from "./notTargetEmit";
import { previousCmd } from "./previousCmd";
import { pickupCmdTarget } from "./pickupCmdTarget";
// import { getLengthFromBPM } from "../util/getLengthFromBPM";
import { metronomeEmit } from "./metronomeEmit";
import { clickFreq } from "./clickFreq";

export const cmdEmit = (
  cmdStrings: string,
  target?: string,
  flag?: boolean,
) => {
  let targetId = "";
  let cmd: {
    cmd: string;
    property?: string;
    value?: number;
    flag?: boolean;
    fade?: number;
    gain?: number;
  };
  const targetIdArr = target
    ? pickupCmdTarget(cmdStrings, { target: target })
    : pickupCmdTarget(cmdStrings);

  switch (cmdStrings) {
    case "STOP":
      const client = "all";
      stopEmit("", "ALL", client);
      break;
    case "WHITENOISE":
    case "FEEDBACK":
    case "BASS":
      const cmdKey = cmdStrings as keyof typeof cmdList;
      cmd = {
        cmd: cmdList[cmdKey],
        gain: cmdState.GAIN[cmdKey],
      };

      if (
        currentState.cmd[cmd.cmd].filter((id) => targetIdArr.includes(id))
          .length > 0
      ) {
        cmd.flag = false;
        cmd.fade = cmdState.FADE.OUT;
        currentState.cmd[cmd.cmd]
          .filter((id) => targetIdArr.includes(id))
          .forEach((id) => {
            delete currentState.cmd[cmd.cmd][id];
          });
      } else {
        cmd.flag = true;
        cmd.fade = cmdState.FADE.IN;
        currentState.cmd[cmd.cmd] = [
          ...currentState.cmd[cmd.cmd],
          ...targetIdArr,
        ];
        console.log(`current ${cmd.cmd}`, currentState.cmd[cmd.cmd]);
      }
      if (flag !== undefined) cmd.flag = flag;

      console.log("flag", flag);
      console.log("cmd", cmd);
      putCmd(targetIdArr, cmd);

      break;
    case "CLICK":
      console.log(cmdState.GAIN.CLICK);
      cmd = {
        cmd: "CLICK",
        gain: cmdState.GAIN.CLICK,
      };
      putCmd(targetIdArr, cmd);
      break;
    case "UP":
    case "DOWN":
    case "SAME":
      const clickFreqValue = clickFreq(cmdStrings);
      cmdState.CLICKFREQ = clickFreqValue;
      // console.log("clickFreq", clickFreqValue);
      cmd = {
        cmd: "CLICK",
        gain: cmdState.GAIN.CLICK,
        value: clickFreqValue,
      };
      putCmd(targetIdArr, cmd);
      break;
    case "SIMULATE":
      console.log(cmdState.GAIN.SIMULATE);
      cmd = {
        cmd: "SIMULATE",
        gain: cmdState.GAIN.SIMULATE,
      };
      putCmd(targetIdArr, cmd);
      break;
    case "METRONOME":
      metronomeEmit(cmd, target);
      break;
    case "PREVIOUS":
    case "PREV":
      console.log("previous");
      previousCmd();
      break;
  }
  cmdStrings = "";
};
