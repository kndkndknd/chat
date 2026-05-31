import { flagState, streamFlagState, audioWorkletState } from "../state";

export const chatReq = (id: string) => {
  // textPrint("chat req", ctx, cnvs);
  console.log("chat req", id);
  flagState.chatFlag = true;
  if (id !== undefined && id) {
    flagState.socketId = id;
  }
  streamFlagState.CHAT = true;
  audioWorkletState.chat.flag.CHAT = true;
};
