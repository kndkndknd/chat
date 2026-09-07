import { clientState, cmdState, currentState } from "../state";
import { cmdList } from "../data";

import { execStop } from "./execStop";
import { cmdEmit } from "../socket/ioEmit";
import { notTargetEmit } from "./notTargetEmit";
import { previousCmd } from "./previousCmd";
import { pickupCmdTarget } from "./pickupCmdTarget";
// import { getLengthFromBPM } from "../util/getLengthFromBPM";
import { metronomeEmit } from "./metronomeEmit";
import { clickFreq } from "./clickFreq";

export const execCmd = (
  cmdStrings: string,
  target?: string,
  flag?: boolean,
) => {
  const command = getCmd(cmdStrings, target, flag);
  switch (command.type) {
    case "CMD":
      if(command.cmd.cmd === "METRONOME") {
        metronomeEmit(command.cmd, command.target?.[0]);
      } else {
        cmdEmit(command.target ?? [""], command.cmd);
      }
      break;
    case "STOP":
      execStop(command.source, command.target ?? "ALL", command.group ?? "ALL");
      break;
    case "PREVIOUS":
      previousCmd();
      break;
  }

  cmdStrings = "";
};

export const getCmd = (cmdStrings: string,
  target?: string,
  flag?: boolean,
):
  {type: "CMD",cmd: { cmd: string; value?: number; flag?: boolean; fade?: number; gain?: number }, target?: string[]} |
  {type: "STOP", source: string, target?: "CMD" | "ALL" | "STREAM" , group?: string} |
  {type: "PREVIOUS"} => {
  // Implement the logic for getCmd here
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
      return { type: "STOP", source: "", target: "ALL", group: client };
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
      return { type: "CMD", cmd, target: targetIdArr };
      // cmdEmit(targetIdArr, cmd);

    case "CLICK":
      console.log(cmdState.GAIN.CLICK);
      cmd = {
        cmd: "CLICK",
        gain: cmdState.GAIN.CLICK,
      };
      return { type: "CMD", cmd, target: targetIdArr };
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
      return { type: "CMD", cmd, target: targetIdArr };
    case "SIMULATE":
      console.log(cmdState.GAIN.SIMULATE);
      cmd = {
        cmd: "SIMULATE",
        gain: cmdState.GAIN.SIMULATE,
      };
      return { type: "CMD", cmd, target: targetIdArr };
    case "METRONOME":
      return { type: "CMD", cmd, target: targetIdArr };
      // metronomeEmit(cmd, target);
      // break;
    case "PREVIOUS":
    case "PREV":
      console.log("previous");
      return { type: "PREVIOUS" };
  }
};
