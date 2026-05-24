"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cmdEmit = void 0;
const state_1 = require("../state");
const data_1 = require("../data");
const stopEmit_1 = require("./stopEmit");
const putCmd_1 = require("./putCmd");
const previousCmd_1 = require("./previousCmd");
const pickupCmdTarget_1 = require("./pickupCmdTarget");
// import { getLengthFromBPM } from "../util/getLengthFromBPM";
const metronomeEmit_1 = require("./metronomeEmit");
const cmdEmit = (cmdStrings, target, flag) => {
    let targetId = "";
    let cmd;
    const targetIdArr = target
        ? (0, pickupCmdTarget_1.pickupCmdTarget)(cmdStrings, { target: target })
        : (0, pickupCmdTarget_1.pickupCmdTarget)(cmdStrings);
    switch (cmdStrings) {
        case "STOP":
            const client = "all";
            (0, stopEmit_1.stopEmit)("", "ALL", client);
            break;
        case "WHITENOISE":
        case "FEEDBACK":
        case "BASS":
            const cmdKey = cmdStrings;
            cmd = {
                cmd: data_1.cmdList[cmdKey],
                gain: state_1.cmdState.GAIN[cmdKey],
            };
            if (state_1.currentState.cmd[cmd.cmd].filter((id) => targetIdArr.includes(id))
                .length > 0) {
                cmd.flag = false;
                cmd.fade = state_1.cmdState.FADE.OUT;
                state_1.currentState.cmd[cmd.cmd]
                    .filter((id) => targetIdArr.includes(id))
                    .forEach((id) => {
                    delete state_1.currentState.cmd[cmd.cmd][id];
                });
            }
            else {
                cmd.flag = true;
                cmd.fade = state_1.cmdState.FADE.IN;
                state_1.currentState.cmd[cmd.cmd] = [
                    ...state_1.currentState.cmd[cmd.cmd],
                    ...targetIdArr,
                ];
                console.log(`current ${cmd.cmd}`, state_1.currentState.cmd[cmd.cmd]);
            }
            if (flag !== undefined)
                cmd.flag = flag;
            console.log("flag", flag);
            console.log("cmd", cmd);
            (0, putCmd_1.putCmd)(targetIdArr, cmd);
            break;
        case "CLICK":
            console.log(state_1.cmdState.GAIN.CLICK);
            cmd = {
                cmd: "CLICK",
                gain: state_1.cmdState.GAIN.CLICK,
            };
            (0, putCmd_1.putCmd)(targetIdArr, cmd);
            break;
        case "SIMULATE":
            console.log(state_1.cmdState.GAIN.SIMULATE);
            cmd = {
                cmd: "SIMULATE",
                gain: state_1.cmdState.GAIN.SIMULATE,
            };
            (0, putCmd_1.putCmd)(targetIdArr, cmd);
            break;
        case "METRONOME":
            (0, metronomeEmit_1.metronomeEmit)(cmd, target);
            break;
        case "PREVIOUS":
        case "PREV":
            console.log("previous");
            (0, previousCmd_1.previousCmd)();
            break;
    }
    cmdStrings = "";
};
exports.cmdEmit = cmdEmit;
//# sourceMappingURL=cmdEmit.js.map