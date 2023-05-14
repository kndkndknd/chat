"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sinewaveChange = void 0;
var putCmd_1 = require("./putCmd");
var sinewaveChange = function (cmdStrings, io, state, value) {
    if (cmdStrings === 'TWICE') {
        for (var id in state.current.sinewave) {
            state.previous.sinewave[id] = state.current.sinewave[id];
            state.current.sinewave[id] = state.current.sinewave[id] * 2;
            var cmd = {
                cmd: 'SINEWAVE',
                value: state.current.sinewave[id],
                flag: true,
                fade: 0,
                portament: state.cmd.PORTAMENT,
                gain: state.cmd.GAIN.SINEWAVE
            };
            (0, putCmd_1.putCmd)(io, id, cmd, state);
            // io.to(id).emit('cmdFromServer', cmd)
        }
    }
    else if (cmdStrings === 'HALF') {
        for (var id in state.current.sinewave) {
            state.previous.sinewave[id] = state.current.sinewave[id];
            state.current.sinewave[id] = state.current.sinewave[id] / 2;
            var cmd = {
                cmd: 'SINEWAVE',
                value: state.current.sinewave[id],
                flag: true,
                fade: 0,
                portament: state.cmd.PORTAMENT,
                gain: state.cmd.GAIN.SINEWAVE
            };
            //io.to(id).emit('cmdFromServer', cmd)
            (0, putCmd_1.putCmd)(io, id, cmd, state);
        }
    }
};
exports.sinewaveChange = sinewaveChange;
//# sourceMappingURL=sinewaveChange.js.map