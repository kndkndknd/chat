import { stringEmit } from "../../socket/ioEmit";
import { putCmd } from "../putCmd";
import { stopEmit } from "../stopEmit";
import { notTargetEmit } from "../notTargetEmit";
import {
  currentState,
  previousState,
  clientState,
  cmdState,
} from "../../state";
import { wholeParams } from "../../data/list/wholeParams";

export const splitStop = (stringArr: string[], io) => {
  console.log("splitStop", stringArr);
  // stringArr[0] === "STOP"
  if (
    stringArr.length === 2 &&
    Object.keys(currentState.stream).includes(stringArr[1])
  ) {
    console.log("stream stop", stringArr[1]);
    previousState.stream[stringArr[1]] = currentState.stream[stringArr[1]];
    currentState.stream[stringArr[1]] = false;
    stringEmit(io, stringArr[0] + " " + stringArr[1]);
  } else if (stringArr.length === 2 && stringArr[1] === "STREAM") {
    console.log("all stream stop");
    previousState.stream = currentState.stream;
    Object.keys(currentState.stream).forEach(
      (key) => (currentState.stream[key] = false)
    );
    stringEmit(io, stringArr[0] + " " + stringArr[1]);
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
      putCmd(io, [cmdTarget], cmd);
      notTargetEmit(cmdTarget, Object.keys(clientState.client), io);
    });
    currentState.cmd[stringArr[1]] = [];
  } else if (stringArr.length === 2 && stringArr[1] === "WHOLE") {
      wholeParams.targetArr = [];
      currentState.WHOLE = false;
  } else if (stringArr.length === 2 && stringArr[1] === "SINEWAVE") {
    previousState.sinewave = currentState.sinewave;
    Object.keys(currentState.sinewave).forEach((target) => {
      const sinewaveCmd = {
        cmd: "SINEWAVE",
        value: currentState.sinewave[target],
        flag: false,
        fade: cmdState.FADE.IN,
        portament: cmdState.PORTAMENT,
        gain: cmdState.GAIN.SINEWAVE,
      };
      putCmd(io, [target], sinewaveCmd);
      notTargetEmit(target, Object.keys(clientState.client), io);
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
        const cmd: { cmd: string; flag: boolean; fade?: number } = {
          cmd: cmdTarget,
          flag: false,
        };

        if (cmdTarget === "WHITENOISE" || cmdTarget === "FEEDBACK") {
          cmd.fade = cmdState.FADE.OUT;
        }
        putCmd(io, [target], cmd);
        currentState.cmd[cmdTarget] = [];
      });
    });
    Object.keys(currentState.sinewave).forEach((key) => {
      const sinewaveCmd = {
        cmd: "SINEWAVE",
        value: currentState.sinewave[key],
        flag: false,
        fade: cmdState.FADE.IN,
        portament: cmdState.PORTAMENT,
        gain: cmdState.GAIN.SINEWAVE,
      };
      putCmd(io, [key], sinewaveCmd);
    });
    currentState.sinewave = {};
  } else if (stringArr[1] === "ALL") {
    stopEmit(io, "", "ALL");
  }
};
