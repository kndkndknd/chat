import { flagState, streamFlagState } from "../state";

export const chatReq = (id: string) => {
  // textPrint("chat req", ctx, cnvs);
  flagState.chatFlag = true;
  if (id !== undefined && id) {
    flagState.socketId = id;
  }
  streamFlagState.CHAT = true;
};
