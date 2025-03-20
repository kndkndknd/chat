import SocketIO from "socket.io";

import { clientState, cmdList, cmdState, currentState } from "../states";

import { stopEmit } from "./stopEmit";
import { putCmd } from "./putCmd";
import { notTargetEmit } from "./notTargetEmit";
import { previousCmd } from "./previousCmd";
import { pickupCmdTarget } from "./pickupCmdTarget";

export const cmdEmit = (
  cmdStrings: string,
  io: SocketIO.Server,
  target?: string,
  flag?: boolean
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

  switch (cmdStrings) {
    case "STOP":
      const client = "all";
      stopEmit(io, "", "ALL", client);
      break;
    case "WHITENOISE":
    case "FEEDBACK":
    case "BASS":
      const targetIdArr = target
        ? pickupCmdTarget(cmdStrings, { target: target })
        : pickupCmdTarget(cmdStrings);
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
      putCmd(io, targetIdArr, cmd);
      /*
      state.previous.cmd[cmd.cmd] = state.current.cmd[cmd.cmd];
      if (target) {
        targetId = target;
        console.log(targetId);
        if (state.current.cmd[cmd.cmd].includes(targetId)) {
          cmd.flag = false;
          cmd.fade = state.cmd.FADE.OUT;
          for (let id in state.current.cmd[cmd.cmd]) {
            if (targetId === state.current.cmd[cmd.cmd][id]) {
              delete state.current.cmd[cmd.cmd][id];
            }
          }
          console.log(state.current.cmd[cmd.cmd]);
        } else {
          cmd.flag = true;
          cmd.fade = state.cmd.FADE.IN;
          state.current.cmd[cmd.cmd].push(targetId);
        }
        cmd.gain = state.cmd.GAIN[cmd.cmd];
      } else {
        if (state.current.cmd[cmd.cmd].length === 0) {
          cmd.flag = true;
          cmd.fade = state.cmd.FADE.IN;
          cmd.gain = state.cmd.GAIN[cmd.cmd];
          targetId =
            state.client[Math.floor(Math.random() * state.client.length)];
          state.current.cmd[cmd.cmd].push(targetId);
        } else {
          cmd.flag = false;
          cmd.fade = state.cmd.FADE.OUT;
          cmd.gain = state.cmd.GAIN[cmd.cmd];
          targetId = state.current.cmd[cmd.cmd].shift();
        }
      }
      */

      // io.to(targetId).emit('cmdFromServer', cmd)
      // putCmd(io, targetId, cmd, state);
      // if (target === undefined) {
      //   notTargetEmit(targetId, state.client, io);
      // }
      break;
    case "CLICK":
      console.log(cmdState.GAIN.CLICK);
      cmd = {
        cmd: "CLICK",
        gain: cmdState.GAIN.CLICK,
      };
      // cmd.gain = state.cmd.GAIN.CLICK
      /*
      if (target) {
        targetId = target;
      } else {
        targetId =
          state.client[Math.floor(Math.random() * state.client.length)];
      }
      */
      const targeIdArr =
        target !== undefined
          ? pickupCmdTarget(cmdStrings, { target: target })
          : pickupCmdTarget(cmdStrings);
      // io.to(targetId).emit('cmdFromServer', cmd)
      putCmd(io, targeIdArr, cmd);
      // notTargetEmit(targetId, state.client, io);
      break;
    case "SIMULATE":
      console.log(cmdState.GAIN.SIMULATE);
      cmd = {
        cmd: "SIMULATE",
        gain: cmdState.GAIN.SIMULATE,
      };
      if (target) {
        targetId = target;
      } else {
        targetId = Object.keys(clientState.client)[
          Math.floor(Math.random() * Object.keys(clientState.client).length)
        ];
      }
      putCmd(io, [targetId], cmd);
      notTargetEmit(targetId, Object.keys(clientState.client), io);
      break;
    case "METRONOME":
      cmd = {
        cmd: "METRONOME",
      };

      if (target) {
        if (currentState.cmd[cmd.cmd].includes(target)) {
          cmd.flag = false;
          cmd.gain = cmdState.GAIN.METRONOME;
          for (let id in currentState.cmd.METRONOME) {
            if (target === currentState.cmd.METRONOME[id]) {
              cmd.value = cmdState.METRONOME[target];
              delete currentState.cmd[cmd.cmd][id];
            }
          }
          console.log(currentState.cmd.METRONOME);
        } else {
          cmd.flag = true;
          cmd.gain = cmdState.GAIN.METRONOME;
          currentState.cmd.METRONOME.push(target);
          cmd.value = cmdState.METRONOME[target];
        }
      } else {
        if (currentState.cmd.METRONOME.length === 0) {
          cmd.flag = true;
          cmd.gain = cmdState.GAIN.METRONOME;
          target = Object.keys(clientState.client)[
            Math.floor(Math.random() * Object.keys(clientState.client).length)
          ];
          currentState.cmd[cmd.cmd].push(target);
          cmd.value = cmdState.METRONOME[target];
        } else {
          cmd.flag = false;
          cmd.gain = cmdState.GAIN.METRONOME;
          target = currentState.cmd.METRONOME.shift();
          cmd.value = cmdState.METRONOME[target];
        }
      }
      putCmd(io, [target], cmd);
      notTargetEmit(target, Object.keys(clientState.client), io);
      console.log("metronome");
      break;
    case "PREVIOUS":
    case "PREV":
      console.log("previous");
      previousCmd(io);
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
