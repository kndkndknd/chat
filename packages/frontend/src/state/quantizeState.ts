import { frontQuantizeStateType, quantizeType } from "../../../../types";


export const quantizeState: quantizeType = {
  bar: 4000,
  interval: null,
  currentTime: 0,
  timeout: 0,
  intervalFlag: false,
  stream: {
    CHAT: {
      flag: false,
      beat: 1,
    },
    PLAYBACK: {
      flag: false,
      beat: 1,
    },
    TIMELAPSE: {
      flag: false,
      beat: 1,
    }
  }
}