import { streamStateType, filterStateType } from "../../../../../types";

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
  filter: {
    CHAT: {
      flag: false,
      type: "lowpass",
      frequency: 1000,
      Q: 2.5,
      gain: 1,
    },
    PLAYBACK: {
      flag: false,
      type: "lowpass",
      frequency: 1000,
      Q: 2.5,
      gain: 1,
    },
    TIMELAPSE: {
      flag: false,
      type: "lowpass",
      frequency: 1000,
      Q: 2.5,
      gain: 1,
    },
  },
  loop: false,
  timelapse: false,
  floating: false,
};

export const defaultFilterState: filterStateType = {
  flag: false,
  type: "lowpass",
  frequency: 1000,
  Q: 2.5,
  gain: 1,
};
