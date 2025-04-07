import { streamStateType } from '../../../../../types';

export const streamState: streamStateType = {
  basisBufferSize: 8192,
  random: {
    CHAT: false,
    PLAYBACK: false,
    TIMELAPSE: false,
  },
  grid: {
    CHAT: false,
    PLAYBACK: false,
    TIMELAPSE: false,
  },
  target: {
    CHAT: [],
    PLAYBACK: [],
    TIMELAPSE: [],
  },
  latency: {
    CHAT: 1000,
    PLAYBACK: 1000,
    TIMELAPSE: 1000,
  },
  loop: false,
  timelapse: false,
  floating: false,
};
