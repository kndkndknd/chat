"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notTargetEmit = void 0;
var notTargetEmit = function (targetId, idArr, io) {
    idArr.forEach(function (id) {
        //    console.log(id)
        if (id !== targetId)
            io.to(id).emit('erasePrintFromServer');
    });
};
exports.notTargetEmit = notTargetEmit;
//# sourceMappingURL=notTargetEmit.js.map