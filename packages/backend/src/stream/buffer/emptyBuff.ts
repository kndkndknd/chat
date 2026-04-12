import { buffStateType } from "../../../../../types";
import { streamState, sampleRateState, glitchState } from "../../state";

export const emptyBuff = (): buffStateType => {
  let audioBuff = new Float32Array(streamState.basisBufferSize);
  for (let i = 0; i < streamState.basisBufferSize; i++) {
    audioBuff[i] = 1.0;
  }
  return {
    source: "EMPTY",
    bufferSize: streamState.basisBufferSize,
    audio: audioBuff.buffer,
    duration: streamState.basisBufferSize / sampleRateState.sampleRate.EMPTY,
    sampleRate: sampleRateState.sampleRate.EMPTY,
    glitch: glitchState.glitch.EMPTY,
  }

}
