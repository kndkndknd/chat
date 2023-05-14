"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voiceEmit = void 0;
var voiceEmit = function (io, strings, state) {
    if (state.cmd.VOICE.length > 0) {
        state.cmd.VOICE.forEach(function (element) {
            io.to(element).emit('voiceFromServer', { text: strings, lang: state.cmd.voiceLang });
        });
    }
};
exports.voiceEmit = voiceEmit;
//# sourceMappingURL=voiceEmit.js.map