import { quantizeState, metronomeState } from "../state";
import { streamFlagState, streamChunk } from "../state";
import { quantizePlay } from "./quantizePlay";

export const bpmFromServer = (data: {bpm: number, source: string[] }) => {
  for (const source of data.source) {
    if(source === "METRONOME") {
      metronomeState.bar = 4 * 60 / data.bpm;
    } else if(source === "MODULATION") {
    } else {
      quantizeState.bar = 4 * 60 / data.bpm;
      if(!quantizeState.stream.includes(source)) {
        quantizeState.stream.push(source);
      }
        // quantizeObj.flagがtrueの場合、streamが実行中の場合、quantizePlayを実行
        if (quantizeState.flag) {
          for (const streamEl of quantizeState.stream) {
            if (
              streamFlagState[streamEl] &&
              streamChunk[streamEl] !== undefined &&
              streamChunk[streamEl].audio !== undefined
            ) {
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
        
    }
  }
};