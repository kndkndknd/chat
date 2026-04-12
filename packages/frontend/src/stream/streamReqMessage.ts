import { streamReqSocketType } from "../../../../types";
import { streamFlagState, audioWorkletState } from "../state";

export const streamReqMessage = ({type, payload}: streamReqSocketType ) => {
  if(payload.source === "CHAT") {
    console.log("streamReqMessage: CHAT");
    // chatReq()
      streamFlagState.CHAT = true;
      audioWorkletState.chat.flag.CHAT = true;
  } else if (payload.source === "TIMELAPSE") {
    audioWorkletState.chat.flag.TIMELAPSE = true;
  } else if (payload.record) {
    // RECORD
    audioWorkletState.chat.flag[payload.source] = true;
    setTimeout(() => {
      audioWorkletState.chat.flag[payload.source] = false;
    }, payload.timeout);
  }
}
