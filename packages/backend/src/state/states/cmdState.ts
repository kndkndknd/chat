import { cmdStateType } from "../../../../../types";
import { createPersistedState } from "../../redis/stateRedis";

export const cmdState = createPersistedState<cmdStateType>("cmdState", {
  GAIN: {
    MASTER: 1.0,
    SINEWAVE: 0.2,
    FEEDBACK: 0.6,
    WHITENOISE: 0.5,
    CLICK: 0.4,
    BASS: 1.5,
    CHAT: 1.5,
    GLITCH: 2,
    SIMULATE: 1.0,
    METRONOME: 0.9,
  },
  FADE: {
    IN: 0,
    OUT: 0,
  },
  SINEWAVE: {},
  PORTAMENT: 0,
  VOICE: [],
  voiceLang: "en-US",
  METRONOME: {},
  CLICKFREQ: 440
});
