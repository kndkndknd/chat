export const putCmd = (io, idArr, cmd, state) => {
    idArr.forEach((id) => {
        io.to(id).emit("cmdFromServer", cmd);
    });
    /*
    if(state.cmd.VOICE.length > 0) {
      state.cmd.VOICE.forEach((element) => {
        io.to(element).emit('voiceFromServer', cmd.cmd)
      })
    }
    */
};
//# sourceMappingURL=putCmd.js.map