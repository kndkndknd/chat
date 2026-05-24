"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopEmit = void 0;
const ioState_1 = require("../state/states/ioState");
const voiceEmit_1 = require("./voiceEmit");
const state_1 = require("../state");
const wholeParams_1 = require("../data/list/wholeParams");
const stopEmit = (source, target, client) => {
    if (source !== undefined && source !== "") {
        (0, voiceEmit_1.voiceEmit)("STOP", source);
    }
    wholeParams_1.wholeParams.targetArr = [];
    state_1.currentState.WHOLE = false;
    // stop cmd / sinewave | self判定あり
    if (client === undefined) {
        if (state_1.clientState.client[source] === undefined ||
            !state_1.clientState.client[source].self) {
            Object.keys(state_1.clientState.client).forEach((element) => {
                ioState_1.ioState?.io.to(element).emit("stopFromServer", {
                    target: target === undefined ? "ALL" : target,
                    fadeOutVal: state_1.cmdState.FADE.OUT,
                });
            });
            for (let cmd in state_1.currentState.cmd) {
                state_1.previousState.cmd[cmd] = state_1.currentState.cmd[cmd];
                state_1.currentState.cmd[cmd] = [];
            }
            state_1.previousState.sinewave = state_1.currentState.sinewave;
            state_1.currentState.sinewave = {};
        }
        else {
            ioState_1.ioState?.io.to(source).emit("stopFromServer", {
                target: target === undefined ? "ALL" : target,
                fadeOutVal: state_1.cmdState.FADE.OUT,
            });
            for (let cmd in state_1.currentState.cmd) {
                if (state_1.currentState.cmd[cmd].includes(source)) {
                    state_1.previousState.cmd[cmd] = state_1.currentState.cmd[cmd];
                    state_1.currentState.cmd[cmd] = state_1.currentState.cmd[cmd].filter((element) => element !== source);
                }
            }
            if (state_1.currentState.sinewave[source] !== undefined) {
                state_1.previousState.sinewave[source] = state_1.currentState.sinewave[source];
                delete state_1.currentState.sinewave[source];
            }
        }
    }
    else if (Object.keys(state_1.clientState.client).includes(client)) {
        ioState_1.ioState?.io.to(client).emit("stopFromServer", {
            target: target === undefined ? "ALL" : target,
            fadeOutVal: state_1.cmdState.FADE.OUT,
        });
        for (let cmd in state_1.currentState.cmd) {
            if (state_1.currentState.cmd[cmd].includes(client)) {
                state_1.previousState.cmd[cmd] = state_1.currentState.cmd[cmd];
                state_1.currentState.cmd[cmd] = state_1.currentState.cmd[cmd].filter((element) => element !== client);
            }
        }
        if (state_1.currentState.sinewave[client] !== undefined) {
            state_1.previousState.sinewave[client] = state_1.currentState.sinewave[client];
            delete state_1.currentState.sinewave[client];
        }
    }
    // stop stream
    for (let stream in state_1.currentState.stream) {
        state_1.previousState.stream[stream] = state_1.currentState.stream[stream];
        state_1.currentState.stream[stream] = false;
    }
    Object.keys(state_1.streamState.target).forEach((element) => {
        state_1.streamState.target[element] = [];
    });
    Object.keys(state_1.streamState.pa).forEach((element) => {
        state_1.streamState.pa[element] = false;
    });
};
exports.stopEmit = stopEmit;
//# sourceMappingURL=stopEmit.js.map