import { streamState } from "../../state";

export const oneshots = {
  KICK: {
    audio: [],
    video: [],
    bufferSize: streamState.basisBufferSize,
  },
  SNARE: {
    audio: [],
    video: [],
    bufferSize: streamState.basisBufferSize,
  },
  HAT: {
    audio: [],
    video: [],
    bufferSize: streamState.basisBufferSize,
  },
  SILENCE: {
    audio: [],
    video: [],
    bufferSize: streamState.basisBufferSize,
  },
};
