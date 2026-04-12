import { playAudioStream } from "./playAudioStream";
import { showImage, textPrint, erasePrint } from "../../canvasEvent";
import { flagState, streamFlagState, audioWorkletState } from "../../state";
import { buffStateType, filterStateType } from "../../../../../types";
import { postStreamReq } from "../../postMessage/postStreamReq";

let index = 0;

export const streamPlay = (
  type: "CHAT" | "STREAM",
  stream: buffStateType,
  cinemaFlag?: boolean
) => {
  // if (!frontState.quantize.flag) {
  // console.log("chatFromServer");
  // console.log("socket.id(socket.on): " + String(socket.id));
  // console.log(stream.audio);
  console.log('recLatencyFlag: ' + String(flagState.recLatency));
  console.log(`sampleRate: ${stream.sampleRate}, bufferSize: ${stream.bufferSize}`);
  index++;


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
    const latency = (stream.bufferSize / stream.sampleRate) * 1000;
    console.log(`Estimated latency for stream ${stream.source}: ${latency.toFixed(2)} ms (${String(index)})`);
    setTimeout(() => {
      if (type === "CHAT") {
        streamFlagState.CHAT = true;
        audioWorkletState.chat.flag.CHAT = true;
      } else {
        // socket.emit("streamReqFromClient", stream.source);
        postStreamReq(stream.source)
      }
      console.log(`Stream ${stream.source} emitted after latency delay of ${latency.toFixed(2)} ms (${String(index)})`);
    }, latency);
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
