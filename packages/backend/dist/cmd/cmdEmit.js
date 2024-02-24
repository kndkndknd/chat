"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cmdEmit = void 0;
const states_js_1 = require("../states.js");
const stopEmit_js_1 = require("./stopEmit.js");
const putCmd_js_1 = require("./putCmd.js");
const notTargetEmit_js_1 = require("./notTargetEmit.js");
const previousCmd_js_1 = require("./previousCmd.js");
const pickupCmdTarget_js_1 = require("./pickupCmdTarget.js");
const cmdEmit = (cmdStrings, io, state, target) => {
    let targetId = "";
    let cmd;
    switch (cmdStrings) {
        case "STOP":
            const client = "all";
            (0, stopEmit_js_1.stopEmit)(io, state, "ALL", client);
            break;
        case "WHITENOISE":
        case "FEEDBACK":
        case "BASS":
            const targetIdArr = target
                ? (0, pickupCmdTarget_js_1.pickupCmdTarget)(state, cmdStrings, target)
                : (0, pickupCmdTarget_js_1.pickupCmdTarget)(state, cmdStrings);
            const cmdKey = cmdStrings;
            cmd = {
                cmd: states_js_1.cmdList[cmdKey],
                gain: state.cmd.GAIN[cmdKey],
            };
            if (state.current.cmd[cmd.cmd].filter((id) => targetIdArr.includes(id))
                .length > 0) {
                cmd.flag = false;
                cmd.fade = state.cmd.FADE.OUT;
                state.current.cmd[cmd.cmd]
                    .filter((id) => targetIdArr.includes(id))
                    .forEach((id) => {
                    delete state.current.cmd[cmd.cmd][id];
                });
            }
            else {
                cmd.flag = true;
                cmd.fade = state.cmd.FADE.IN;
                state.current.cmd[cmd.cmd] = [
                    ...state.current.cmd[cmd.cmd],
                    targetIdArr,
                ];
            }
            (0, putCmd_js_1.putCmd)(io, targetIdArr, cmd, state);
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
            console.log(state.cmd.GAIN.CLICK);
            cmd = {
                cmd: "CLICK",
                gain: state.cmd.GAIN.CLICK,
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
            const targeIdArr = target !== undefined
                ? (0, pickupCmdTarget_js_1.pickupCmdTarget)(state, cmdStrings, target)
                : (0, pickupCmdTarget_js_1.pickupCmdTarget)(state, cmdStrings);
            // io.to(targetId).emit('cmdFromServer', cmd)
            (0, putCmd_js_1.putCmd)(io, targeIdArr, cmd, state);
            // notTargetEmit(targetId, state.client, io);
            break;
        case "SIMULATE":
            console.log(state.cmd.GAIN.SIMULATE);
            cmd = {
                cmd: "SIMULATE",
                gain: state.cmd.GAIN.SIMULATE,
            };
            if (target) {
                targetId = target;
            }
            else {
                targetId =
                    state.client[Math.floor(Math.random() * state.client.length)];
            }
            (0, putCmd_js_1.putCmd)(io, [targetId], cmd, state);
            (0, notTargetEmit_js_1.notTargetEmit)(targetId, state.client, io);
            break;
        case "METRONOME":
            cmd = {
                cmd: "METRONOME",
            };
            if (target) {
                if (state.current.cmd[cmd.cmd].includes(target)) {
                    cmd.flag = false;
                    cmd.gain = state.cmd.GAIN.METRONOME;
                    for (let id in state.current.cmd.METRONOME) {
                        if (target === state.current.cmd.METRONOME[id]) {
                            cmd.value = state.cmd.METRONOME[target];
                            delete state.current.cmd[cmd.cmd][id];
                        }
                    }
                    console.log(state.current.cmd.METRONOME);
                }
                else {
                    cmd.flag = true;
                    cmd.gain = state.cmd.GAIN.METRONOME;
                    state.current.cmd.METRONOME.push(target);
                    cmd.value = state.cmd.METRONOME[target];
                }
            }
            else {
                if (state.current.cmd.METRONOME.length === 0) {
                    cmd.flag = true;
                    cmd.gain = state.cmd.GAIN.METRONOME;
                    target =
                        state.client[Math.floor(Math.random() * state.client.length)];
                    state.current.cmd[cmd.cmd].push(target);
                    cmd.value = state.cmd.METRONOME[target];
                }
                else {
                    cmd.flag = false;
                    cmd.gain = state.cmd.GAIN.METRONOME;
                    target = state.current.cmd.METRONOME.shift();
                    cmd.value = state.cmd.METRONOME[target];
                }
            }
            (0, putCmd_js_1.putCmd)(io, [target], cmd, state);
            (0, notTargetEmit_js_1.notTargetEmit)(target, state.client, io);
            console.log("metronome");
            break;
        case "PREVIOUS":
        case "PREV":
            console.log("previous");
            (0, previousCmd_js_1.previousCmd)(io, state);
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
exports.cmdEmit = cmdEmit;
//# sourceMappingURL=cmdEmit.js.map