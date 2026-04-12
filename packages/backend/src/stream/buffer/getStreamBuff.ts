
import { buffStateType } from "../../../../../types";
import { streams } from "../../data/chunk/streams";
import { sampleRateState, streamState, glitchState } from "../../state";
import { emptyBuff } from "./emptyBuff";

export const getStreamBuff = (source: string): buffStateType | undefined => {
    let buff: buffStateType;
  if ( source === "EMPTY") {
    return emptyBuff();
  } else {
    if(streams[source] === undefined || streams[source].audio.length === 0) {
      console.log(`No audio buffer for source: ${source}`);
      return;
    }
    if(!(streamState.random[source])) {
      const index = streams[source].index || 0;
      const buff: buffStateType = {
        source,
        audio: streams[source].audio[index] as ArrayBuffer,
        video: streams[source].video.length > 0 ? streams[source].video[index] : undefined,
        bufferSize: streams[source].bufferSize,
        duration: (streams[source].bufferSize / sampleRateState.sampleRate[source]) || 0,
        sampleRate: sampleRateState.sampleRate[source],
        glitch: glitchState.glitch[source],
      }
      if (
        ((streams[source].video === undefined ||
          streams[source].video.length === 0) &&
          streams[source].index < streams[source].audio.length - 1) ||
        (streams[source].index < streams[source].audio.length - 1 &&
          streams[source].index < streams[source].video.length - 1)
      ) {
        streams[source].index++;
      } else {
        streams[source].index = 0;
      }
      return buff;
    } else {
      const randomIndex = Math.floor(Math.random() * streams[source].audio.length);
      return {
        source,
        audio: streams[source].audio[randomIndex] as ArrayBuffer,
        video: (streams[source].video.length > 0 && streams[source].video[randomIndex]) ? streams[source].video[randomIndex] : undefined,
        bufferSize: streams[source].bufferSize,
        duration: (streams[source].bufferSize / sampleRateState.sampleRate[source]) || 0,
        sampleRate: sampleRateState.sampleRate[source],
        glitch: glitchState.glitch[source],
      }
    }
  }
};
