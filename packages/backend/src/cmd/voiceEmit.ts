import SocketIO from "socket.io";
import { cmdState } from "../states";

export const voiceEmit = (io: SocketIO.Server, strings: string, id: string) => {
  console.log("id", id);
  console.log("VOICE", cmdState.VOICE);
  if (cmdState.VOICE.length > 0) {
    cmdState.VOICE.forEach((element) => {
      if (element === id || id === "all" || id === "ALL" || id === "scenario") {
        io.to(element).emit("voiceFromServer", {
          text: strings,
          lang: cmdState.voiceLang,
        });
      } else {
        console.log("not voice id");
      }
    });
  }
};
