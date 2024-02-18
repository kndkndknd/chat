export const voiceEmit = (io, strings, state) => {
    if (state.cmd.VOICE.length > 0) {
        state.cmd.VOICE.forEach((element) => {
            io.to(element).emit("voiceFromServer", {
                text: strings,
                lang: state.cmd.voiceLang,
            });
        });
    }
};
//# sourceMappingURL=voiceEmit.js.map