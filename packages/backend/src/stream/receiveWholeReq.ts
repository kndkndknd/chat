import SocketIO from "socket.io";
import { chats } from "../data";
import { wholeEmit } from "./wholeEmit";
import { currentState } from "../state";

export const receiveWholeReq = (io: SocketIO.Server, data: {audio: ArrayBuffer; video: string; source: string; bufferSize: number} | undefined) => {
  if(!currentState.WHOLE) {
    console.log("receiveWholeReq: currentState.WHOLE is false, skipping processing");
    return;
  }
  console.log("receiveWholeReq", data);
  if(data !== undefined) {
    chats.push({
      audio: data.audio,
      video: data.video,
      source: data.source,
      bufferSize: data.bufferSize,
      duration: data.bufferSize / 44100, // assuming sample rate of 44100 Hz
    });
  }
  wholeEmit(io);
}
