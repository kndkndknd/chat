"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.putCmd = void 0;
const ioState_1 = require("../state/states/ioState");
const arduinoAccess_1 = require("../arduinoAccess/arduinoAccess");
// import { time } from "console";
const state_1 = require("../state");
const putCmd = (idArr, cmd) => {
    console.log('idArr', idArr);
    idArr.forEach((id) => {
        ioState_1.ioState?.io.to(id).emit("cmdFromServer", cmd);
        console.log(id);
        if (state_1.clientState.client[id] !== undefined &&
            state_1.clientState.client[id].urlPathName.includes("pi") &&
            state_1.arduinoState.connected) {
            let timeout = cmd.cmd === "CLICK" || cmd.cmd === "STOP" ? 100 : 500;
            const result = (0, arduinoAccess_1.switchOneshot)(timeout);
            console.log("putCmd: switchOneshot", result);
        }
    });
    /*
    if(state.cmd.VOICE.length > 0) {
      state.cmd.VOICE.forEach((element) => {
        ioState?.io.to(element).emit('voiceFromServer', cmd.cmd);
      })
    }
    */
};
exports.putCmd = putCmd;
//# sourceMappingURL=putCmd.js.map