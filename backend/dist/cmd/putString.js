"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.putString = void 0;
var putString = function (io, strings, state) {
    io.emit('stringsFromServer', { strings: strings, timeout: true });
    /*
    if(state.cmd.VOICE.length > 0) {
      state.cmd.VOICE.forEach((element) => {
        io.to(element).emit('voiceFromServer', strings)
      })
    }
    */
};
exports.putString = putString;
//# sourceMappingURL=putString.js.map