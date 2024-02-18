import { putCmd } from "./putCmd.js";
export const sinewaveChange = (cmdStrings, io, state, value) => {
    if (cmdStrings === "TWICE") {
        for (let id in state.current.sinewave) {
            state.previous.sinewave[id] = state.current.sinewave[id];
            state.current.sinewave[id] = state.current.sinewave[id] * 2;
            const cmd = {
                cmd: "SINEWAVE",
                value: state.current.sinewave[id],
                flag: true,
                fade: 0,
                portament: state.cmd.PORTAMENT,
                gain: state.cmd.GAIN.SINEWAVE,
            };
            putCmd(io, [id], cmd, state);
            // io.to(id).emit('cmdFromServer', cmd)
        }
    }
    else if (cmdStrings === "HALF") {
        for (let id in state.current.sinewave) {
            state.previous.sinewave[id] = state.current.sinewave[id];
            state.current.sinewave[id] = state.current.sinewave[id] / 2;
            const cmd = {
                cmd: "SINEWAVE",
                value: state.current.sinewave[id],
                flag: true,
                fade: 0,
                portament: state.cmd.PORTAMENT,
                gain: state.cmd.GAIN.SINEWAVE,
            };
            //io.to(id).emit('cmdFromServer', cmd)
            putCmd(io, [id], cmd, state);
        }
    }
};
//# sourceMappingURL=sinewaveChange.js.map