import { filterStateType } from "./stateType";

export type buffStateType = {
  source: string;
  audio: Float32Array;
  video: string;
  bufferSize: number;
  duration: number;
  from?: string;
  floating?: boolean;
  filter?: filterStateType;
};

export type buffArrayType = {
  KICK: {
    audio: Array<Float32Array>;
    video: Array<string>;
    index: number;
  };
  SNARE: {
    audio: Array<Float32Array>;
    video: Array<string>;
    index: number;
  };
  HAT: {
    audio: Array<Float32Array>;
    video: Array<string>;
    index: number;
  };
  SILENCE: {
    audio: Array<Float32Array>;
    video: Array<string>;
    index: number;
  };
  CHAT: {
    audio: Array<Float32Array>;
    video: Array<string>;
    index: number;
  };
  PLAYBACK: {
    audio: Array<Float32Array>;
    video: Array<string>;
    index: number;
  };
  TIMELAPSE: {
    audio: Array<Float32Array>;
    video: Array<string>;
    index: number;
  };
};

export type StreamsType = {
  [key: string]: {
    audio: Array<Float32Array>;
    video: Array<string>;
    index: number;
    bufferSize: number;
  };
};
