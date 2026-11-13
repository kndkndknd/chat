import { currentStateType } from "../../../../../types";
import { createPersistedState } from "../../redis/stateRedis";

export const currentState = createPersistedState<currentStateType>("currentState", {
  cmd: {
    FEEDBACK: [],
    WHITENOISE: [],
    CLICK: [],
    BASS: [],
    METRONOME: [],
  },
  sinewave: {},
  stream: {
    CHAT: false,
    PLAYBACK: false,
    TIMELAPSE: false,
  },
  RECORD: false,
  WHOLE: false,
});
