"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.putCmd = void 0;
const putCmd = (io, id, cmd, state) => {
    io.to(id).emit('cmdFromServer', cmd);
    /*
    if(state.cmd.VOICE.length > 0) {
      state.cmd.VOICE.forEach((element) => {
        io.to(element).emit('voiceFromServer', cmd.cmd)
      })
    }
    */
};
exports.putCmd = putCmd;
//# sourceMappingURL=putCmd.js.map