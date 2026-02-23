import { flagState, audioWorkletState } from "../../state";

export const recordReqFromServer = (recordReq: {
  source: string;
  timeout: number;
}) => {
  console.log("recordReq", recordReq);
  switch (recordReq.source) {
    case "PLAYBACK":
      // flagState.recordFlag = true;
      console.log(`start record as ${recordReq.source}`);
      audioWorkletState.flag.PLAYBACK = true;
      setTimeout(() => {
        // flagState.recordFlag = false;
        audioWorkletState.flag.PLAYBACK = false;
        console.log(`stop record as ${recordReq.source}`);
      }, recordReq.timeout);
      break;
    default:
      console.log("other");
      // flagState.otherStreamFlag = recordReq.source;
      audioWorkletState.flag[recordReq.source] = true;
      setTimeout(() => {
        // flagState.otherStreamFlag = "";
        audioWorkletState.flag[recordReq.source] = false;
      }, recordReq.timeout);
      break;
  }
};
