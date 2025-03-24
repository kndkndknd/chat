import { quantize } from "./webaudio";

export const cnvs = <HTMLCanvasElement>document.getElementById("cnvs");
export const ctx = <CanvasRenderingContext2D>cnvs.getContext("2d");
export const videoElement = <HTMLVideoElement>document.getElementById("video");
export const frontState = {
  start: false,
  recLatency: true,
  quantize: {
    flag: false,
    bar: 0,
    beat: 1,
    interval: 0,
    currentTime: 0,
    timeout: 0,
    stream: [],
  },
  metronome: {
    status: false,
    fournote: 0,
  },
  floatingPosition: {},
  streamChunk: {
    CHAT: {},
    PLAYBACK: {},
    TIMELAPSE: {},
  },
  streamFlag: {
    CHAT: false,
    PLAYBACK: false,
    TIMELAPSE: false,
  },
  recordFlag: false,
  timelapseFlag: false,
  otherStreamFlag: "",
  chatFlag: false,
  simulate: false,
  timelapse: false,
};
