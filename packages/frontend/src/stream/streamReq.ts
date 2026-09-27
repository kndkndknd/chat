import { flagState } from "../state";
import { SocketFacade } from "../socket/SocketFacade";
import { chatReq } from "./chatReq";
import { filterStateType } from "../../../../types";

export const streamReq = (
  socket: SocketFacade, 
  type: string, 
    stream: {
    audio: Float32Array;
    sampleRate: number;
    glitch: boolean;
    bufferSize: number;
    duration?: number;
    video?: string;
    source?: string;
    floating?: boolean;
    filter?: filterStateType;
    index?: number;
  }, 
  streamReqBody: string | {source: string; index: number;}
) => {
  if (flagState.recLatency) {
    // console.log("debugCount:", debugCount);
    setTimeout(() => {
      if (type !== "CHAT") {
        socket.emit("streamReqFromClient", streamReqBody);
      } else {
        // console.log("debugCount in setTimeout:", debugCount);
        chatReq(socket.id);
      }
    }, (stream.bufferSize / stream.sampleRate) * 1000);
    // debugCount++;
  } else {
    if (type !== "CHAT") {
      socket.emit("streamReqFromClient", streamReqBody);
    } else {
      chatReq(socket.id);
    }
  }
};
