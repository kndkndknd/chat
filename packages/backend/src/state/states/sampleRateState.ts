import { sampleRateStateType } from "../../../../../types";

export const sampleRateState: sampleRateStateType = {
  sampleRate: {
    CHAT: 44100,
    PLAYBACK: 44100,
    TIMELAPSE: 44100,
    EMPTY: 44100,
  },
  randomrate: {
    CHAT: false,
    PLAYBACK: false,
    TIMELAPSE: false,
  },
  randomratemode: "random",
  randomratekey: "A",
  randomraterange: {
    CHAT: {
      min: 4000,
      max: 132300,
    },
    PLAYBACK: {
      min: 4000,
      max: 132300,
    },
    TIMELAPSE: {
      min: 4000,
      max: 132300,
    },
  },
  randomratenote: {
    CHAT: false,
    PLAYBACK: false,
    TIMELAPSE: false,
  },
};
