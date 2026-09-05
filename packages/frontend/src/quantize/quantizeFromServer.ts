import type { bpmStreamStateType } from "../../../../types";
import { millisecondsPerBar } from "../util/bpmCalc";
import { streamFlagState, streamChunk, quantizeState, contextState } from "../state";
import { quantizeType } from "../../../../types";
import { quantizePlay } from "./quantizePlay";

export const quantizeFromServer = (data: bpmStreamStateType, bpm: number): quantizeType => {
  try {
    const bar = millisecondsPerBar(bpm);
    const hasQuantizeFlag: boolean = Object.values(data).some(stream => stream.quantizeFlag);
    // const stopFlag = (bar !== quantizeState.bar) || (quantizeState.intervalFlag && !hasQuantizeFlag);
    if(bar !== quantizeState.bar || (quantizeState.intervalFlag && !hasQuantizeFlag)) {
      clearInterval(quantizeState.interval);
      quantizeState.interval = null;
      quantizeState.intervalFlag = false;
    }
    if(bar !== quantizeState.bar || (!quantizeState.intervalFlag && hasQuantizeFlag)) {
      quantizeInterval(quantizeState.bar)
      quantizeState.intervalFlag = true;
    }
    return quantizeState;
  } catch (error) {
    console.error("Error in quantizeFromServer:", error);
    return error;
  }

  // for (const stream in data) {
  //   if (data[stream] !== undefined) {
  //     //OFF→ON
  //     if((quantizeState[stream].flag === undefined || !quantizeState[stream].flag)
  //       && data[stream].quantizeFlag) {
  //       quantizeState[stream].beat = data[stream].beat;
  //       quantizeState.bar = bar;
  //       quantizeInterval(quantizeState.bar, stream);
  //     // ON→OFF
  //     } else if (quantizeState[stream].flag && !data[stream].quantizeFlag) {
  //       clearInterval(quantizeState.interval);
  //       quantizeState.interval = null;
  //     // ON→ON
  //     } else if (quantizeState[stream].flag && data[stream].quantizeFlag) {
  //       quantizeState[stream].beat = data[stream].beat;
  //       if(quantizeState.bar !== bar) {
  //         // 一度停止
  //         clearInterval(quantizeState.interval);
  //         quantizeState.interval = null;
  //         // 新しいパラメータで再度開始
  //         quantizeState.bar = bar;
  //         quantizeInterval(quantizeState.bar, stream);
  //       }
  //     // OFF→OFF
  //     } else {
  //       quantizeState[stream].beat = data[stream].beat;
  //       quantizeState[stream].bar = bar;
  //     }
  //   }
  // }
  return quantizeState;
};


const quantizeInterval = (bar: number) => {
  quantizeState.interval = window.setInterval(() => {
    console.log("streamFlagState", streamFlagState);
    console.log("streamChunkFlag", Object.keys(streamChunk));
    console.log("bar", bar);
    for (const stream of Object.keys(quantizeState.stream)) {
      // console.log("stream", stream);
      if (
        streamFlagState[stream] &&
        streamChunk[stream] !== undefined &&
        streamChunk[stream].audio !== undefined &&
        quantizeState[stream].flag
      ) {
        quantizePlay(streamChunk[stream]);
      }
    }
    quantizeState.currentTime = contextState.audioContext.currentTime;
    // console.log("currentTime", quantizeState[stream].currentTime);
  }, bar);
};
