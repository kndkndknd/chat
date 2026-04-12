import { streamList } from "../packages/backend/src/data/list/streamList";

export type bpmClientStateType = {
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
  TORCH: {
    flag: boolean;
    type: "BLINK" | "STEADY";
    bpm: number;
  };
  stream: bpmStreamStateType;
};

export type bpmStreamStateType = {
  [stream: string]: {
    bpm: number;
    beat: number;
    gridFlag: boolean;
    quantizeFlag: boolean;
    latency: number;
  };
};

type Stream = (typeof streamList)[number];

export type quantizeParamClass = Partial<{
  flag: boolean; // 要素① "TRUE"/"FALSE" -> boolean
  stream: Stream; // 要素② streamListのいずれか
  beat: number; // 要素③ 数値文字列かつ <= 32
  bpm: number; // 要素④ 数値文字列かつ >= 33
}>;
