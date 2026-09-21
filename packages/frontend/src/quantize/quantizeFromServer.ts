import type { bpmStreamStateType } from "../../../../types";
import { millisecondsPerBar } from "../util/bpmCalc";
import {
  streamFlagState,
  streamChunk,
  quantizeState,
  contextState,
} from "../state";
import { quantizeType } from "../../../../types";
import { quantizePlay } from "./quantizePlay";

export const quantizeFromServer = (
  data: bpmStreamStateType,
  bpm?: number,
): quantizeType => {
  if (bpm !== undefined && bpm > 0) {
    quantizeState.bar = millisecondsPerBar(bpm);
  }

  for (const stream in data) {
    if (quantizeState.stream[stream] === undefined) {
      continue;
    }
    quantizeState.stream[stream].flag = data[stream].quantizeFlag;
    quantizeState.stream[stream].beat = data[stream].beat;
  }

  refreshQuantizeInterval();
  return quantizeState;
};

export const refreshQuantizeInterval = (): void => {
  const hasQuantizeFlag = Object.keys(quantizeState.stream).some(
    (stream) => quantizeState.stream[stream].flag,
  );
  clearInterval(quantizeState.interval);
  quantizeState.interval = null;
  if (hasQuantizeFlag) {
    quantizeInterval(quantizeState.bar);
    quantizeState.intervalFlag = true;
  } else {
    quantizeState.intervalFlag = false;
  }
};

const quantizeInterval = (bar: number): void => {
  quantizeState.interval = window.setInterval(() => {
    for (const stream of Object.keys(quantizeState.stream)) {
      if (
        streamFlagState[stream] &&
        streamChunk[stream] !== undefined &&
        streamChunk[stream].audio !== undefined &&
        quantizeState.stream[stream].flag
      ) {
        quantizePlay(streamChunk[stream], quantizeState.stream[stream].beat);
      }
    }
    quantizeState.currentTime = contextState.audioContext?.currentTime ?? 0;
  }, bar);
};
