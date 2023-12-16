import SocketIO from "socket.io";
import { cmdStateType } from "../types/global";

export const recordEmit = (
  io: SocketIO.Server,
  state: cmdStateType,
  target?: string
) => {
  if (!state.current.RECORD) {
    state.current.RECORD = true;
    if (target && target !== undefined) {
      console.log(`target: ${target}`);
      io.to(target).emit("recordReqFromServer", {
        target: "PLAYBACK",
        timeout: 10000,
      });
    } else {
      console.log("all");
      io.emit("recordReqFromServer", { target: "PLAYBACK", timeout: 10000 });
    }
    if (state.cmd.VOICE.length > 0) {
      state.cmd.VOICE.forEach((element) => {
        //          io.to(element).emit('voiceFromServer', 'RECORD')
        io.to(element).emit("voiceFromServer", {
          text: "RECORD",
          lang: state.cmd.voiceLang,
        });
      });
    }
  } else {
    state.current.RECORD = false;
  }
};
