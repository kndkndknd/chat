"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cmdEmit = void 0;
var states_1 = require("../states");
var stopEmit_1 = require("./stopEmit");
var putCmd_1 = require("./putCmd");
var notTargetEmit_1 = require("./notTargetEmit");
var cmdEmit = function (cmdStrings, io, state, target) {
    var targetId = '';
    var cmd;
    switch (cmdStrings) {
        case 'STOP':
            (0, stopEmit_1.stopEmit)(io, state);
            break;
        case 'WHITENOISE':
        case 'FEEDBACK':
        case 'BASS':
            var cmdKey = cmdStrings;
            cmd = {
                cmd: states_1.cmdList[cmdKey]
            };
            state.previous.cmd[cmd.cmd] = state.current.cmd[cmd.cmd];
            if (target) {
                targetId = target;
                console.log(targetId);
                if (state.current.cmd[cmd.cmd].includes(targetId)) {
                    cmd.flag = false;
                    cmd.fade = state.cmd.FADE.OUT;
                    for (var id in state.current.cmd[cmd.cmd]) {
                        if (targetId === state.current.cmd[cmd.cmd][id]) {
                            delete state.current.cmd[cmd.cmd][id];
                        }
                    }
                    console.log(state.current.cmd[cmd.cmd]);
                }
                else {
                    cmd.flag = true;
                    cmd.fade = state.cmd.FADE.IN;
                    state.current.cmd[cmd.cmd].push(targetId);
                }
                cmd.gain = state.cmd.GAIN[cmd.cmd];
            }
            else {
                if (state.current.cmd[cmd.cmd].length === 0) {
                    cmd.flag = true;
                    cmd.fade = state.cmd.FADE.IN;
                    cmd.gain = state.cmd.GAIN[cmd.cmd];
                    targetId = state.client[Math.floor(Math.random() * state.client.length)];
                    state.current.cmd[cmd.cmd].push(targetId);
                }
                else {
                    cmd.flag = false;
                    cmd.fade = state.cmd.FADE.OUT;
                    cmd.gain = state.cmd.GAIN[cmd.cmd];
                    targetId = state.current.cmd[cmd.cmd].shift();
                }
            }
            // io.to(targetId).emit('cmdFromServer', cmd)
            (0, putCmd_1.putCmd)(io, targetId, cmd, state);
            (0, notTargetEmit_1.notTargetEmit)(targetId, state.client, io);
            break;
        case 'CLICK':
            console.log(state.cmd.GAIN.CLICK);
            cmd = {
                cmd: 'CLICK',
                gain: state.cmd.GAIN.CLICK
            };
            // cmd.gain = state.cmd.GAIN.CLICK
            if (target) {
                targetId = target;
            }
            else {
                targetId = state.client[Math.floor(Math.random() * state.client.length)];
            }
            // io.to(targetId).emit('cmdFromServer', cmd)
            (0, putCmd_1.putCmd)(io, targetId, cmd, state);
            (0, notTargetEmit_1.notTargetEmit)(targetId, state.client, io);
            break;
        case 'SIMULATE':
            console.log(state.cmd.GAIN.SIMULATE);
            cmd = {
                cmd: 'SIMULATE',
                gain: state.cmd.GAIN.SIMULATE
            };
            if (target) {
                targetId = target;
            }
            else {
                targetId = state.client[Math.floor(Math.random() * state.client.length)];
            }
            (0, putCmd_1.putCmd)(io, targetId, cmd, state);
            (0, notTargetEmit_1.notTargetEmit)(targetId, state.client, io);
            break;
        case 'METRONOME':
            cmd = {
                cmd: 'METRONOME'
            };
            if (target) {
                if (state.current.cmd[cmd.cmd].includes(target)) {
                    cmd.flag = false;
                    cmd.gain = state.cmd.GAIN.METRONOME;
                    for (var id in state.current.cmd.METRONOME) {
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
                    target = state.client[Math.floor(Math.random() * state.client.length)];
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
            (0, putCmd_1.putCmd)(io, target, cmd, state);
            (0, notTargetEmit_1.notTargetEmit)(target, state.client, io);
            console.log('metronome');
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
    cmdStrings = '';
};
exports.cmdEmit = cmdEmit;
//# sourceMappingURL=cmdEmit.js.map