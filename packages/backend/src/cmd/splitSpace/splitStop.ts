import { stringEmit } from "../../socket/ioEmit";
import { putCmd } from "../cmdEmit";
import { stopEmit } from "../stopEmit";
import { notTargetEmit } from "../notTargetEmit";
import {
  currentState,
  previousState,
  clientState,
  cmdState,
} from "../../state";

export const splitStop = (stringArr: string[]) => {
  console.log("splitStop", stringArr);
  // stringArr[0] === "STOP"
  if (
    stringArr.length === 2 &&
    Object.keys(currentState.stream).includes(stringArr[1])
  ) {
    console.log("stream stop", stringArr[1]);
    previousState.stream[stringArr[1]] = currentState.stream[stringArr[1]];
    currentState.stream[stringArr[1]] = false;
    stringEmit(stringArr[0] + " " + stringArr[1]);
  } else if (stringArr.length === 2 && stringArr[1] === "STREAM") {
    console.log("all stream stop");
    previousState.stream = currentState.stream;
    Object.keys(currentState.stream).forEach(
      (key) => (currentState.stream[key] = false),
    );
    stringEmit(stringArr[0] + " " + stringArr[1]);
  } else if (
    stringArr.length === 2 &&
    Object.keys(currentState.cmd).includes(stringArr[1])
  ) {
    console.log("cmd stop", stringArr);
    previousState.cmd[stringArr[1]] = currentState.cmd[stringArr[1]];
    currentState.cmd[stringArr[1]].forEach((cmdTarget) => {
      const cmd: { cmd: string; flag: boolean; fade?: number } = {
        cmd: stringArr[1],
        flag: false,
      };

      if (stringArr[1] === "WHITENOISE" || stringArr[1] === "FEEDBACK") {
        cmd.fade = cmdState.FADE.OUT;
      }
      console.log(cmdTarget, stringArr);
      putCmd([cmdTarget], {
        cmd: stringArr[1],
        option: { fade: cmd.fade, flag: false },
      });
      notTargetEmit(cmdTarget, Object.keys(clientState.client));
    });
    currentState.cmd[stringArr[1]] = [];
  } else if (stringArr.length === 2 && stringArr[1] === "SINEWAVE") {
    previousState.sinewave = currentState.sinewave;
    Object.keys(currentState.sinewave).forEach((target) => {
      const sinewaveOption = {
        value: currentState.sinewave[target],
        flag: false,
        fade: cmdState.FADE.IN,
        portament: cmdState.PORTAMENT,
        gain: cmdState.GAIN.SINEWAVE,
      };
      putCmd([target], { cmd: "SINEWAVE", option: sinewaveOption });
      notTargetEmit(target, Object.keys(clientState.client));
    });
    currentState.sinewave = {};
  } else if (
    stringArr.length === 2 &&
    (stringArr[1] === "CMD" || stringArr[1] === "COMMAND")
  ) {
    previousState.cmd = currentState.cmd;
    previousState.sinewave = currentState.sinewave;
    Object.keys(currentState.cmd).forEach((cmdTarget) => {
      currentState.cmd[cmdTarget].forEach((target) => {
        const cmdOption: { flag: boolean; fade?: number } = {
          flag: false,
        };

        if (cmdTarget === "WHITENOISE" || cmdTarget === "FEEDBACK") {
          cmdOption.fade = cmdState.FADE.OUT;
        }
        putCmd([target], { cmd: cmdTarget, option: cmdOption });
        currentState.cmd[cmdTarget] = [];
      });
    });
    Object.keys(currentState.sinewave).forEach((key) => {
      const sinewaveOption = {
        value: currentState.sinewave[key],
        flag: false,
        fade: cmdState.FADE.IN,
        portament: cmdState.PORTAMENT,
        gain: cmdState.GAIN.SINEWAVE,
      };
      putCmd([key], { cmd: "SINEWAVE", option: sinewaveOption });
    });
    currentState.sinewave = {};
  } else if (stringArr[1] === "ALL") {
    stopEmit("", "ALL");
  }
};
