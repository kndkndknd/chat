import { streamStateType } from "../../../../../types";

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
  loop: false,
  timelapse: false,
  floating: false,
};
