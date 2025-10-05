import { bpmClientStateType } from "../../../../../types";
import { quantizeCmd } from "../../stream/quantize/quantizeCmd";
// export type bpmClientStateType = {
//   METRONOME: {
//     bpm: number;
//     beat: number;
//     flag: boolean;
//   };
//   MODULATION: {
//     flag: boolean;
//     bpm: number;
//     beat: number;
//   };
//   stream: {
//     [stream: string]: {
//       bpm: number;
//       beat: number;
//       gridFlag: boolean;
//       quantizeFlag: boolean;
//       latency: number;
//     };
//   };
// };

export const bpmState: {
  [client: string]: bpmClientStateType;
} = {};

export const bpmStateDefault = {
  bpm: 60,
  beat: 4,
  gridFlag: false,
  quantizeFlag: false,
  latency: 60000 / 60 / 4,
  metronomeFlag: false,
  modulationFlag: false,
};
