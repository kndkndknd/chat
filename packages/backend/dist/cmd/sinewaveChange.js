"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sinewaveChange = void 0;
const putCmd_1 = require("./putCmd");
const state_1 = require("../state");
const sinewaveChange = (cmdStrings, options) => {
    if (options === undefined || options.id === undefined) {
        if (cmdStrings === "TWICE") {
            for (let id in state_1.currentState.sinewave) {
                state_1.previousState.sinewave[id] = state_1.currentState.sinewave[id];
                state_1.currentState.sinewave[id] = state_1.currentState.sinewave[id] * 2;
                const cmd = {
                    cmd: "SINEWAVE",
                    value: state_1.currentState.sinewave[id],
                    flag: true,
                    fade: 0,
                    portament: state_1.cmdState.PORTAMENT,
                    gain: state_1.cmdState.GAIN.SINEWAVE,
                };
                (0, putCmd_1.putCmd)([id], cmd);
            }
        }
        else if (cmdStrings === "HALF") {
            for (let id in state_1.currentState.sinewave) {
                state_1.previousState.sinewave[id] = state_1.currentState.sinewave[id];
                state_1.currentState.sinewave[id] = state_1.currentState.sinewave[id] / 2;
                const cmd = {
                    cmd: "SINEWAVE",
                    value: state_1.currentState.sinewave[id],
                    flag: true,
                    fade: 0,
                    portament: state_1.cmdState.PORTAMENT,
                    gain: state_1.cmdState.GAIN.SINEWAVE,
                };
                (0, putCmd_1.putCmd)([id], cmd);
            }
        }
    }
    else {
        const id = options.id;
        if (cmdStrings === "TWICE") {
            state_1.previousState.sinewave[id] = state_1.currentState.sinewave[id];
            state_1.currentState.sinewave[id] = state_1.currentState.sinewave[id] * 2;
            const cmd = {
                cmd: "SINEWAVE",
                value: state_1.currentState.sinewave[id],
                flag: true,
                fade: 0,
                portament: state_1.cmdState.PORTAMENT,
                gain: state_1.cmdState.GAIN.SINEWAVE,
            };
            (0, putCmd_1.putCmd)([id], cmd);
        }
        else if (cmdStrings === "HALF") {
            state_1.previousState.sinewave[id] = state_1.currentState.sinewave[id];
            state_1.currentState.sinewave[id] = state_1.currentState.sinewave[id] / 2;
            const cmd = {
                cmd: "SINEWAVE",
                value: state_1.currentState.sinewave[id],
                flag: true,
                fade: 0,
                portament: state_1.cmdState.PORTAMENT,
                gain: state_1.cmdState.GAIN.SINEWAVE,
            };
            (0, putCmd_1.putCmd)([id], cmd);
        }
    }
};
exports.sinewaveChange = sinewaveChange;
//# sourceMappingURL=sinewaveChange.js.map