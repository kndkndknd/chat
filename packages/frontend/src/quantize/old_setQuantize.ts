import {
  quantizeState,
  streamFlagState,
  streamChunk,
  flagState,
  contextState,
} from "../state";
import { quantizePlay } from "./quantizePlay";

export const setQuantize = (bar: number, beat?: number, stream?: string[]) => {
  console.log("bar", bar);
  console.log("streamFlag: ", streamFlagState);
  console.log("quantize stream: ", quantizeState.stream);
  // frontState.quantize.flag = true;
  // frontState.quantize.bar = bar;
  // frontState.quantize.beat =
  //   beat !== undefined ? beat : frontState.quantize.beat;
  // frontState.quantize.stream =
  //   stream !== undefined ? stream : frontState.quantize.stream;

  quantizeState.interval = window.setInterval(() => {
    for (const stream of quantizeState.stream) {
      console.log("stream", stream);
      if (
        streamFlagState[stream] &&
        streamChunk[stream] !== undefined &&
        streamChunk[stream].audio !== undefined
      ) {
        quantizePlay(streamChunk[stream]);
      }
    }
    quantizeState.currentTime = contextState.audioContext.currentTime;
    console.log("bar currentTime", quantizeState.currentTime);
  }, bar);
  // eighthNoteSec = eightNote;
  // quantizeInterval = window.setInterval(() => {
  //   console.log("quantize");
  //   quantizerCurrentTime = audioContext.currentTime;
  //   console.log(quantizerCurrentTime);
  // }, bar);
};
