"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.previousCmd = void 0;
var cmdEmit_1 = require("./cmdEmit");
var stream_1 = require("../stream");
var sinewaveEmit_1 = require("./sinewaveEmit");
var previousCmd = function (io, state) {
    var _loop_1 = function (cmd) {
        state.previous.cmd[cmd].forEach(function (target) {
            (0, cmdEmit_1.cmdEmit)(cmd, io, state, target);
        });
    };
    for (var cmd in state.previous.cmd) {
        _loop_1(cmd);
    }
    for (var stream in state.previous.stream) {
        if (state.previous.stream[stream]) {
            (0, stream_1.streamEmit)(stream, io, state);
        }
    }
    for (var target in state.previous.sinewave) {
        (0, sinewaveEmit_1.sinewaveEmit)(String(state.previous.sinewave[target]), io, state, target);
    }
};
exports.previousCmd = previousCmd;
//# sourceMappingURL=previousCmd.js.map