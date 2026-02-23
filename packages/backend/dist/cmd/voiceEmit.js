"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voiceEmit = void 0;
const voiceEmit = (io, strings, id, state) => {
    console.log("id", id);
    console.log("VOICE", state.cmd.VOICE);
    if (state.cmd.VOICE.length > 0) {
        state.cmd.VOICE.forEach((element) => {
            if (element === id || id === "all" || id === "ALL" || id === "scenario") {
                io.to(element).emit("voiceFromServer", {
                    text: strings,
                    lang: state.cmd.voiceLang,
                });
            }
            else {
                console.log("not voice id");
            }
        });
    }
};
exports.voiceEmit = voiceEmit;
//# sourceMappingURL=voiceEmit.js.map