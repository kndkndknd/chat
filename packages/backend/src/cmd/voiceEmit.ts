import SocketIO from "socket.io";
import { cmdStateType } from "../types/global";

export const voiceEmit = (
  io: SocketIO.Server,
  strings: string,
  state: cmdStateType
) => {
  if (state.cmd.VOICE.length > 0) {
    state.cmd.VOICE.forEach((element) => {
      io.to(element).emit("voiceFromServer", {
        text: strings,
        lang: state.cmd.voiceLang,
      });
    });
  }
};
