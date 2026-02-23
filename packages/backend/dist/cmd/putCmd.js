"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.putCmd = void 0;
const arduinoAccess_1 = require("../arduinoAccess/arduinoAccess");
const putCmd = (io, idArr, cmd, state) => {
    idArr.forEach((id) => {
        io.to(id).emit("cmdFromServer", cmd);
        console.log(id);
        if (state.client[id] !== undefined &&
            state.client[id].urlPathName.includes("pi") &&
            state.arduino.connected) {
            let timeout = cmd.cmd === "CLICK" || cmd.cmd === "STOP" ? 100 : 500;
            const result = (0, arduinoAccess_1.switchOneshot)(timeout);
            console.log("putCmd: switchOneshot", result);
        }
    });
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