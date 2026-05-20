import { flagState, audioWorkletState } from "../../state";

export const recordReqFromServer = (recordReq: {
  source: string;
  timeout: number;
  index?: number;
}) => {
  console.log("recordReq", recordReq);
  switch (recordReq.source) {
    case "PLAYBACK":
      // flagState.recordFlag = true;
      console.log(`start record as ${recordReq.source}`);
      audioWorkletState.chat.flag.PLAYBACK = true;
      if (recordReq.index !== undefined) {
        audioWorkletState.chat.recordIndex.PLAYBACK = recordReq.index;
      }
      setTimeout(() => {
        // flagState.recordFlag = false;
        audioWorkletState.chat.flag.PLAYBACK = false;
        console.log(`stop record as ${recordReq.source}`);
      }, recordReq.timeout);
      break;
    default:
      console.log("other");
      // flagState.otherStreamFlag = recordReq.source;
      audioWorkletState.chat.flag[recordReq.source] = true;
      setTimeout(() => {
        // flagState.otherStreamFlag = "";
        audioWorkletState.chat.flag[recordReq.source] = false;
      }, recordReq.timeout);
      break;
  }
};
