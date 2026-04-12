import { playAudioStream } from "./playAudioStream";
import { showImage, textPrint, erasePrint } from "../../canvasEvent";
import { flagState, streamFlagState, audioWorkletState } from "../../state";
import { buffStateType, filterStateType } from "../../../../../types";
import { postStreamReq } from "../../postMessage/postStreamReq";


export const streamPlay = (
  type: "CHAT" | "STREAM",
  stream: buffStateType,
  cinemaFlag?: boolean
) => {
  // if (!frontState.quantize.flag) {
  // console.log("chatFromServer");
  // console.log("socket.id(socket.on): " + String(socket.id));
  // console.log(stream.audio);

  playAudioStream(
    stream.audio,
    stream.sampleRate,
    stream.glitch,
    stream.bufferSize,
    stream.filter
  );
  if (stream.video) {
    showImage(stream.video);
    if (type === "STREAM" && cinemaFlag !== undefined && cinemaFlag) {
      setTimeout(() => {
        erasePrint();
      }, 300);
    }
  } else if (stream.source !== undefined) {
    textPrint(stream.source.toLowerCase());
  }
  if (flagState.recLatency) {
    setTimeout(() => {
      if (type === "CHAT") {
        streamFlagState.CHAT = true;
        audioWorkletState.chat.flag.CHAT = true;
      } else {
        // socket.emit("streamReqFromClient", stream.source);
        postStreamReq(stream.source)
      }
    }, (stream.bufferSize / stream.sampleRate) * 1000);
  } else {
    if (type === "CHAT") {
      streamFlagState.CHAT = true;
      audioWorkletState.chat.flag.CHAT = true;  
    } else {
      postStreamReq(stream.source)
      // socket.emit("streamReqFromClient", stream.source);
    }
  }
};
