"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voiceEmit = void 0;
const ioState_1 = require("../state/states/ioState");
const state_1 = require("../state");
const voiceEmit = (strings, id) => {
    console.log("id", id);
    console.log("VOICE", state_1.cmdState.VOICE);
    if (state_1.cmdState.VOICE.length > 0) {
        state_1.cmdState.VOICE.forEach((element) => {
            if (element === id || id === "all" || id === "ALL" || id === "scenario") {
                ioState_1.ioState?.io.to(element).emit("voiceFromServer", {
                    text: strings,
                    lang: state_1.cmdState.voiceLang,
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