"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.previousCmd = void 0;
const cmdEmit_1 = require("./cmdEmit");
const stream_1 = require("../stream");
const sinewaveEmit_1 = require("./sinewaveEmit");
const previousCmd = (io, state) => {
    for (let cmd in state.previous.cmd) {
        state.previous.cmd[cmd].forEach(target => {
            (0, cmdEmit_1.cmdEmit)(cmd, io, state, target);
        });
    }
    for (let stream in state.previous.stream) {
        if (state.previous.stream[stream]) {
            (0, stream_1.streamEmit)(stream, io, state);
        }
    }
    for (let target in state.previous.sinewave) {
        (0, sinewaveEmit_1.sinewaveEmit)(String(state.previous.sinewave[target]), io, state, target);
    }
};
exports.previousCmd = previousCmd;
//# sourceMappingURL=previousCmd.js.map