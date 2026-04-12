import { filterStateType } from "./stateType";

export type buffStateType = {
  source: string;
  audio: ArrayBuffer;
  video?: string;
  bufferSize: number;
  duration: number;
  sampleRate: number;
  glitch: boolean;
  from?: string;
  floating?: boolean;
  filter?: filterStateType;
  target?: string;
  position?: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
};

export type buffArrayType = {
  KICK: {
    audio: Array<ArrayBuffer>;
    video: Array<string>;
    index: number;
  };
  SNARE: {
    audio: Array<ArrayBuffer>;
    video: Array<string>;
    index: number;
  };
  HAT: {
    audio: Array<ArrayBuffer>;
    video: Array<string>;
    index: number;
  };
  SILENCE: {
    audio: Array<ArrayBuffer>;
    video: Array<string>;
    index: number;
  };
  CHAT: {
    audio: Array<ArrayBuffer>;
    video: Array<string>;
    index: number;
  };
  PLAYBACK: {
    audio: Array<ArrayBuffer>;
    video: Array<string>;
    index: number;
  };
  TIMELAPSE: {
    audio: Array<ArrayBuffer>;
    video: Array<string>;
    index: number;
  };
};

export type StreamsType = {
  [key: string]: {
    audio: Array<ArrayBuffer>;
    video: Array<string>;
    index: number;
    bufferSize: number;
  };
};
