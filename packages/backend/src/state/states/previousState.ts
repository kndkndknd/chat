import { previousStateType } from "../../../../../types";
import { createPersistedState } from "../../redis/stateRedis";

export const previousState = createPersistedState<previousStateType>("previousState", {
  text: "",
  cmd: {
    FEEDBACK: [],
    WHITENOISE: [],
    CLICK: [],
    BASS: [],
    METRONOME: [],
    CINEMA: [],
    SYNTH: [],
  },
  sinewave: {},
  stream: {
    CHAT: false,
    PLAYBACK: false,
    TIMELAPSE: false,
  },
  RECORD: false,
});
