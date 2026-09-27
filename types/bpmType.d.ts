import { streamList } from "../packages/backend/src/stream/streamList";

export type bpmStateType = {
  [client: string]: bpmClientStateType;
}

export type bpmClientStateType = {
    bpm: number;
    METRONOME: {
      beat: number;
      flag: boolean;
    };
    MODULATION: {
      beat: number;
      flag: boolean;
    };
    TORCH: {
      flag: boolean;
      type: "BLINK" | "STEADY";
      beat: number;
    };
    stream: bpmStreamStateType;
};

export type bpmStreamStateType = {
  [stream: string]: {
    beat: number;
    gridFlag: boolean;
    quantizeFlag: boolean;
    // latency: number;
  };
};

type Stream = (typeof streamList)[number];

export type quantizeParamClass = Partial<{
  flag: boolean; // 要素① "TRUE"/"FALSE" -> boolean
  stream: Stream; // 要素② streamListのいずれか
  beat: number; // 要素③ 数値文字列かつ <= 32
  bpm: number; // 要素④ 数値文字列かつ >= 33
}>;
