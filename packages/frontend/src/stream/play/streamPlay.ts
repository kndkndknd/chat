import { playAudioStream } from "./playAudioStream";
import { chatReq } from "../chatReq";
import { showImage, textPrint, erasePrint } from "../../canvasEvent";
import { flagState } from "../../state";
import { Socket } from "socket.io-client";
import { filterStateType } from "../../../../../types";

let debugCount = 0;

export const streamPlay = async (
  type: "CHAT" | "STREAM",
  socket: Socket,
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
  },
  cinemaFlag?: boolean
) => {
  // if (!frontState.quantize.flag) {
  // console.log("chatFromServer");
  // console.log("socket.id(socket.on): " + String(socket.id));
  // console.log(stream.audio);
  console.log("sampleRate:", stream.sampleRate);
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
    console.log("debugCount:", debugCount);
    setTimeout(() => {
      if (type !== "CHAT") {
        socket.emit("streamReqFromClient", stream.source);
      } else {
        console.log("debugCount in setTimeout:", debugCount);
        chatReq(socket.id);
      }
    }, (stream.bufferSize / stream.sampleRate) * 1000);
    debugCount++;
  } else {
    if (type !== "CHAT") {
      socket.emit("streamReqFromClient", stream.source);
    } else {
      chatReq(socket.id);
    }
  }
};
