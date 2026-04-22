export type wholeSinewaveOption = {
  type: "sinewave";
  cmd: "SINEWAVE";
  frequency: number;
  duration: number;
  gain: number
}

export type wholeStreamOption = {
  type: "stream";
  source: string;
  audio: ArrayBuffer;
  video?: string;
  bufferSize: number;
  duration: number;
  sampleRate: number;
  glitch?: boolean;
}

export type wholeCmdExceptSinewaveOption = {
  type: "other";
  cmd: string;
  duration: number;
  gain: number;
}

export type wholeCmdOption = wholeSinewaveOption | wholeStreamOption | wholeCmdExceptSinewaveOption;
