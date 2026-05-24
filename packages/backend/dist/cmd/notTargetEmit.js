"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notTargetEmit = void 0;
const ioState_1 = require("../state/states/ioState");
const notTargetEmit = (targetId, idArr) => {
    idArr.forEach((id) => {
        console.log("erasePrint", id);
        if (id !== targetId)
            ioState_1.ioState?.io.to(id).emit("erasePrintFromServer");
    });
};
exports.notTargetEmit = notTargetEmit;
//# sourceMappingURL=notTargetEmit.js.map