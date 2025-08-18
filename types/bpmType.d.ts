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
