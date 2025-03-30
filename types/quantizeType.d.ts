export type quantizeObjType = {
  flag: boolean;
  bpm: number;
  bar: number;
  beat: number;
  stream?: string[];
  client?: string[];
};

export type frontQuantizeStateType = {
  flag: boolean;
  bar: number;
  beat: number;
  interval: number | null;
  currentTime: number;
  timeout: number;
  stream: string[];
};
