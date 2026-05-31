import { chatsRedis } from "../data";
import { wholeEmit } from "./wholeEmit";
import { currentState } from "../state";

export const receiveWholeReq = async (data: {audio: ArrayBuffer; video: string; source: string; bufferSize: number} | undefined) => {
  if (!currentState.WHOLE) {
    console.log("receiveWholeReq: currentState.WHOLE is false, skipping processing");
    return;
  }
  console.log("receiveWholeReq", data);
  if (data !== undefined) {
    await chatsRedis.push({
      audio: data.audio,
      video: data.video,
      source: data.source,
      bufferSize: data.bufferSize,
      duration: data.bufferSize / 44100,
    });
  }
  await wholeEmit();
};
