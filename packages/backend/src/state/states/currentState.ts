import { currentStateType } from '../../../../../types';

export const currentState: currentStateType = {
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
};
