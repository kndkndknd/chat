import { audioWorkletState } from "../../state";
export const recordReqFromServer = (recordReq) => {
    console.log("recordReq", recordReq);
    switch (recordReq.source) {
        case "PLAYBACK":
            // flagState.recordFlag = true;
            audioWorkletState.flag.PLAYBACK = true;
            setTimeout(() => {
                // flagState.recordFlag = false;
                audioWorkletState.flag.PLAYBACK = false;
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
