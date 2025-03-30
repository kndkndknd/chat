import {
  streamFlagState,
  streamChunk,
  flagState,
  quantizeState,
} from "../state";
import { setQuantize } from "./setQuantize";
import { quantizePlay } from "./quantizePlay";
import { textPrint, erasePrint } from "../canvasEvent";
import { frontQuantizeStateType } from "../../../../types";
// import { setQuantizeState } from "./setQuantizeState";

export const quantizeFromServer = (data: {
  flag: boolean;
  stream: string[];
  bpm: number;
  bar: number;
  beat: number;
}) => {
  console.log("quantizeFromServer", data);
  const quantizeObj: frontQuantizeStateType = setQuantize(data);
  quantizeState.flag = quantizeObj.flag;
  quantizeState.bar = quantizeObj.bar;
  quantizeState.beat = quantizeObj.beat;
  quantizeState.stream = quantizeObj.stream;
  quantizeState.timeout = quantizeObj.timeout;
  quantizeState.interval = quantizeObj.interval;

  if (quantizeObj.flag) {
    // streamが実行中の場合、quantizePlayを実行
    for (const streamEl of quantizeObj.stream) {
      if (
        streamFlagState[streamEl] &&
        streamChunk[streamEl] !== undefined &&
        streamChunk[streamEl].audio !== undefined
      ) {
        // console.log("quantizePlay", streamEl);
        quantizePlay({
          source: streamEl,
          video:
            streamChunk[streamEl].video === undefined
              ? ""
              : streamChunk[streamEl].video,
          audio: streamChunk[streamEl].audio,
          sampleRate: streamChunk[streamEl].sampleRate,
          glitch: streamChunk[streamEl].glitch,
          bufferSize: streamChunk[streamEl].bufferSize,
        });
      }
    }
  }

  const string = quantizeObj.flag
    ? `QUANTIZE:${quantizeObj.flag}, bpm:${data.bpm}, beat:${data.beat}`
    : "QUANTIZE:false";
  // 文字表示
  textPrint(string);
  setTimeout(() => {
    erasePrint();
  }, 800);
};
