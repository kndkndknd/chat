"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopEmit = void 0;
const voiceEmit_1 = require("./voiceEmit");
const stopEmit = (io, state, source, target, client) => {
    /*
    io.emit('stopFromServer', {
      target: target,
      fadeOut: state.cmd.FADE.OUT
    })
    */
    // STOPは個別の関数があるのでVOICEはそこに相乗り
    // if (state.cmd.VOICE.length > 0) {
    //   state.cmd.VOICE.forEach((element) => {
    //     //      io.to(element).emit('voiceFromServer', "STOP")
    //     io.to(element).emit("voiceFromServer", {
    //       text: "STOP",
    //       lang: state.cmd.voiceLang,
    //     });
    //   });
    // }
    if (source !== undefined) {
        (0, voiceEmit_1.voiceEmit)(io, "STOP", source, state);
    }
    // stop cmd / sinewave
    if (client === undefined) {
        // current -> previous && current -> stop
        Object.keys(state.client).forEach((element) => {
            io.to(element).emit("stopFromServer", {
                target: target === undefined ? "ALL" : target,
                fadeOutVal: state.cmd.FADE.OUT,
            });
        });
        for (let cmd in state.current.cmd) {
            state.previous.cmd[cmd] = state.current.cmd[cmd];
            state.current.cmd[cmd] = [];
        }
        state.previous.sinewave = state.current.sinewave;
        state.current.sinewave = {};
        if (target !== "ExceptHls") {
            state.hls = [];
        }
        // state.hls = [];
    }
    else if (Object.keys(state.client).includes(client)) {
        io.to(client).emit("stopFromServer", {
            target: target === undefined ? "ALL" : target,
            fadeOutVal: state.cmd.FADE.OUT,
        });
        for (let cmd in state.current.cmd) {
            if (state.current.cmd[cmd].includes(client)) {
                state.previous.cmd[cmd] = state.current.cmd[cmd];
                state.current.cmd[cmd] = state.current.cmd[cmd].filter((element) => element !== client);
            }
        }
        if (state.current.sinewave[client] !== undefined) {
            state.previous.sinewave[client] = state.current.sinewave[client];
            delete state.current.sinewave[client];
        }
        if (target !== "ExceptHls") {
            state.hls = state.hls.filter((element) => element !== client);
        }
        // state.hls = state.hls.filter((element) => element !== client);
    }
    // stop stream
    for (let stream in state.current.stream) {
        state.previous.stream[stream] = state.current.stream[stream];
        state.current.stream[stream] = false;
    }
    Object.keys(state.stream.target).forEach((element) => {
        state.stream.target[element] = [];
    });
    console.log("client", state.client);
    console.log("hls", state.hls);
    console.log("previous", state.previous);
};
exports.stopEmit = stopEmit;
//# sourceMappingURL=stopEmit.js.map