export const notTargetEmit = (targetId, idArr, io) => {
    idArr.forEach((id) => {
        //    console.log(id)
        if (id !== targetId)
            io.to(id).emit('erasePrintFromServer');
    });
};
//# sourceMappingURL=notTargetEmit.js.map