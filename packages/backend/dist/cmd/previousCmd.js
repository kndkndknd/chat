"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.previousCmd = void 0;
const state_1 = require("../state");
const cmdEmit_1 = require("./cmdEmit");
const streamEmit_1 = require("../stream/streamEmit");
const sinewaveEmit_1 = require("./sinewaveEmit");
const chatPreparation_1 = require("../stream/chatPreparation");
const previousCmd = () => {
    console.log("previous sinewave", state_1.previousState.sinewave);
    console.log("previous cmd", state_1.previousState.cmd);
    console.log("previous stream", state_1.previousState.stream);
    for (let cmd in state_1.previousState.cmd) {
        state_1.previousState.cmd[cmd].forEach((target) => {
            (0, cmdEmit_1.cmdEmit)(cmd, target);
        });
    }
    for (let stream in state_1.previousState.stream) {
        if (state_1.previousState.stream[stream]) {
            if (stream === "CHAT") {
                console.log("chat previous");
                (0, chatPreparation_1.chatPreparation)();
            }
            else {
                (0, streamEmit_1.streamEmit)(stream);
            }
        }
    }
    for (let target in state_1.previousState.sinewave) {
        console.log(state_1.previousState.sinewave[target]);
        (0, sinewaveEmit_1.sinewaveEmit)(state_1.previousState.sinewave[target], target);
    }
};
exports.previousCmd = previousCmd;
//# sourceMappingURL=previousCmd.js.map