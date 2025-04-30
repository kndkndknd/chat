import { bpmStateType } from "../../../../../types";

// export const bpmState: bpmStateType = {
//   client: {},
//   stream: {},
//   METRONOME: 60,
//   MODULATION: 1,
// };

// export const bpmState: {
//   stream: {
//     [stream: string]: {
//       [client: string]: {
//         bpm: number;
//         beat: number;
//         flag: boolean;
//       };
//     };
//   };
//   METRONOME: {
//     [client: string]: {
//       bpm: number;
//       beat: number;
//       flag: boolean;
//     };
//   };
//   MODULATION: {
//     flag: boolean;
//     bpm: number;
//     beat: number;
//   };
// } = {
//   stream: {
//     CHAT: {},
//     PLAYBACK: {},
//     TIMELAPSE: {},
//     EMPTY: {},
//   },
//   METRONOME: {},
//   MODULATION: {
//     flag: false,
//     bpm: 60,
//     beat: 4,
//   },
// };

export const bpmState: {
  [client: string]: {
    METRONOME: {
      bpm: number;
      beat: number;
      flag: boolean;
    };
    MODULATION: {
      flag: boolean;
      bpm: number;
      beat: number;
    };
    stream: {
      [stream: string]: {
        bpm: number;
        beat: number;
        gridFlag: boolean;
        quantizeFlag: boolean;
        latency: number;
      };
    };
  };
} = {};
