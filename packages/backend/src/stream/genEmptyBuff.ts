import { streamState } from "../state";

export const genEmptyBuff = (): ArrayBuffer => {
  let audioBuff = new Float32Array(streamState.basisBufferSize);
  for (let i = 0; i < streamState.basisBufferSize; i++) {
    audioBuff[i] = 1.0;
  }
  return audioBuff.buffer;
};
