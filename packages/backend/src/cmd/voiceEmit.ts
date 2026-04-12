import { cmdState, webSocketState } from "../state";
import { targetEmit, broadcastEmit } from "../webSocket";

export const voiceEmit = (strings: string, id: string) => {
  console.log("id", id);
  console.log("VOICE", cmdState.VOICE);
  if (cmdState.VOICE.length > 0) {
    if (id === "all" || id === "ALL" || id === "scenario") {
      broadcastEmit({
        type: "voice",
        payload: {
          text: strings,
          lang: cmdState.voiceLang,
        },
      });
    } else {
      cmdState.VOICE.forEach((element) => {
        if (element === id) {
          targetEmit(element, {
            type: "voice",
            payload: {
              text: strings,
              lang: cmdState.voiceLang,
            },
          });
        } else {
          console.log("not voice id");
        }
      });
    }
  }
};
