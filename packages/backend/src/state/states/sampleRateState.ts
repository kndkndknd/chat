import { sampleRateStateType } from "../../../../../types";
import { createPersistedState } from "../../redis/stateRedis";

export const sampleRateState = createPersistedState<sampleRateStateType>("sampleRateState", {
  sampleRate: {
    CHAT: 44100,
    PLAYBACK: 44100,
    TIMELAPSE: 44100,
    EMPTY: 44100,
  },
  randomrate: {
    CHAT: true,
    PLAYBACK: true,
    TIMELAPSE: true,
    EMPTY: false,
  },
  randomratemode: "random",
  randomratekey: "A",
  randomraterange: {
    CHAT: { min: 4000, max: 132300 },
    PLAYBACK: { min: 4000, max: 132300 },
    TIMELAPSE: { min: 4000, max: 132300 },
    EMPTY: { min: 4000, max: 132300 },
  },
  randomratenote: {
    CHAT: false,
    PLAYBACK: false,
    TIMELAPSE: false,
  },
});
