import { bpmClientStateType } from "../../../../../types";

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
  torchBlinkFlag: false,
  torchType: <"STEADY" | "BLINK">"STEADY",
};
