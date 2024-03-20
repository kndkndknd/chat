import { cmdStateType } from "../../types/global";
import { stringEmit } from "../../socket/ioEmit";
import { putCmd } from "../putCmd";
import { stopEmit } from "../stopEmit";
import { notTargetEmit } from "../notTargetEmit";

export const splitStop = (stringArr: string[], state: cmdStateType, io) => {
  console.log("splitStop", stringArr);
  // stringArr[0] === "STOP"
  if (
    stringArr.length === 2 &&
    Object.keys(state.current.stream).includes(stringArr[1])
  ) {
    console.log("stream stop", stringArr[1]);
    state.previous.stream[stringArr[1]] = state.current.stream[stringArr[1]];
    state.current.stream[stringArr[1]] = false;
    stringEmit(io, stringArr[0] + " " + stringArr[1]);
  } else if (stringArr.length === 2 && stringArr[1] === "STREAM") {
    console.log("all stream stop");
    state.previous.stream = state.current.stream;
    Object.keys(state.current.stream).forEach(
      (key) => (state.current.stream[key] = false)
    );
    stringEmit(io, stringArr[0] + " " + stringArr[1]);
  } else if (
    stringArr.length === 2 &&
    Object.keys(state.current.cmd).includes(stringArr[1])
  ) {
    console.log("cmd stop", stringArr);
    state.previous.cmd[stringArr[1]] = state.current.cmd[stringArr[1]];
    state.current.cmd[stringArr[1]].forEach((cmdTarget) => {
      const cmd: { cmd: string; flag: boolean; fade?: number } = {
        cmd: stringArr[1],
        flag: false,
      };

      if (stringArr[1] === "WHITENOISE" || stringArr[1] === "FEEDBACK") {
        cmd.fade = state.cmd.FADE.OUT;
      }
      console.log(cmdTarget, stringArr);
      putCmd(io, [cmdTarget], cmd, state);
      notTargetEmit(cmdTarget, state.client, io);
    });
    state.current.cmd[stringArr[1]] = [];
  } else if (stringArr.length === 2 && stringArr[1] === "SINEWAVE") {
    state.previous.sinewave = state.current.sinewave;
    Object.keys(state.current.sinewave).forEach((target) => {
      const sinewaveCmd = {
        cmd: "SINEWAVE",
        value: state.current.sinewave[target],
        flag: false,
        fade: state.cmd.FADE.IN,
        portament: state.cmd.PORTAMENT,
        gain: state.cmd.GAIN.SINEWAVE,
      };
      putCmd(io, [target], sinewaveCmd, state);
      notTargetEmit(target, state.client, io);
    });
    state.current.sinewave = {};
  } else if (
    stringArr.length === 2 &&
    (stringArr[1] === "CMD" || stringArr[1] === "COMMAND")
  ) {
    state.previous.cmd = state.current.cmd;
    state.previous.sinewave = state.current.sinewave;
    Object.keys(state.current.cmd).forEach((cmdTarget) => {
      state.current.cmd[cmdTarget].forEach((target) => {
        const cmd: { cmd: string; flag: boolean; fade?: number } = {
          cmd: cmdTarget,
          flag: false,
        };

        if (cmdTarget === "WHITENOISE" || cmdTarget === "FEEDBACK") {
          cmd.fade = state.cmd.FADE.OUT;
        }
        putCmd(io, [target], cmd, state);
        state.current.cmd[cmdTarget] = [];
      });
    });
    Object.keys(state.current.sinewave).forEach((key) => {
      const sinewaveCmd = {
        cmd: "SINEWAVE",
        value: state.current.sinewave[key],
        flag: false,
        fade: state.cmd.FADE.IN,
        portament: state.cmd.PORTAMENT,
        gain: state.cmd.GAIN.SINEWAVE,
      };
      putCmd(io, [key], sinewaveCmd, state);
    });
    state.current.sinewave = {};
  } else if (stringArr[1] === "ALL") {
    stopEmit(io, state, "ALL");
  }
};
