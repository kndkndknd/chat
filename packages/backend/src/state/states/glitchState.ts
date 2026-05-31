import { glitchStateType } from "../../../../../types";
import { createPersistedState } from "../../redis/stateRedis";

export const glitchState = createPersistedState<glitchStateType>("glitchState", {
  glitch: {
    CHAT: false,
    PLAYBACK: false,
    TIMELAPSE: false,
  },
  glitchSampleRate: 96000,
});
