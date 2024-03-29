"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.previousCmd = void 0;
const cmdEmit_js_1 = require("./cmdEmit.js");
const streamEmit_js_1 = require("../stream/streamEmit.js");
const sinewaveEmit_js_1 = require("./sinewaveEmit.js");
const chatPreparation_js_1 = require("../stream/chatPreparation.js");
const previousCmd = (io, state) => {
    console.log(state.previous.sinewave);
    console.log(state.previous.cmd);
    for (let cmd in state.previous.cmd) {
        state.previous.cmd[cmd].forEach((target) => {
            (0, cmdEmit_js_1.cmdEmit)(cmd, io, state, target);
        });
    }
    for (let stream in state.previous.stream) {
        if (state.previous.stream[stream]) {
            if (stream === "CHAT") {
                console.log("chat previous");
                (0, chatPreparation_js_1.chatPreparation)(io, state);
            }
            else {
                (0, streamEmit_js_1.streamEmit)(stream, io, state);
            }
        }
    }
    for (let target in state.previous.sinewave) {
        console.log(state.previous.sinewave[target]);
        (0, sinewaveEmit_js_1.sinewaveEmit)(state.previous.sinewave[target], io, state, target);
    }
};
exports.previousCmd = previousCmd;
//# sourceMappingURL=previousCmd.js.map