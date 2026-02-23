import { flagState } from "../../state";

export const recordReqFromServer = (recordReq: {
  source: string;
  timeout: number;
}) => {
  console.log(recordReq);
  switch (recordReq.source) {
    case "PLAYBACK":
      flagState.recordFlag = true;
      setTimeout(() => {
        flagState.recordFlag = false;
      }, recordReq.timeout);
      break;
    default:
      console.log("other");
      flagState.otherStreamFlag = recordReq.source;
      setTimeout(() => {
        flagState.otherStreamFlag = "";
      }, recordReq.timeout);
      break;
  }
};
