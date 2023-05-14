import type { cmdStateType, buffArrayType } from "../../types/global";

export const cmdState: cmdStateType = {
  cmdProcess: {
    SINEWAVE: false,
    WHITENOISE: false,
    FEEDBACK: false,
    BASS: false,
    CHAT: false,
    PLAYBACK: false,
    TIMELAPSE: false,
    INTERNET: false,
    FILE: false,
    DRUM: false,
    SILENCE: false,
    RECORD: false,
    SWITCH: false,
    KICK: false,
    SNARE: false,
    HAT: false,
    FAN: false
  },
  cmdList: {
    FEEDBACK: "FEEDBACK",
    FEED: "FEEDBACK",
    WHITENOISE: "WHITENOISE",
    NOISE: "WHITENOISE",
    CLICK: "CLICK",
    BASS: "BASS",
    VIDEOCHAT: "CHAT",
    CHAT: "CHAT",
    RECORD: "RECORD",
    REC: "RECORD",
    SAMPLERATE: "SAMPLERATE",
    RATE: "SAMPLERATE",
    DRUM: "DRUM",
    KICK: "KICK",
    SNARE: "SNARE",
    HAT: "HAT",
    SILENCE: "SILENCE",
    PLAY: "PLAYBACK",
    PLAYBACK: "PLAYBACK",
    LAPSE: "TIMELAPSE",
    TIMELAPSE: "TIMELAPSE",
    FILTER: "FILTER",
    MONITORING: "CHAT",
    MONITOR: "CHAT",
    SINEWAVE: "SINEWAVE",
    TWICE: "TWICE",
    DOUBLE: "TWICE",
    THRICE: "THRICE",
    TRIPLE: "THRICE",
    HALF: "HALF",
    BACKGROUNDNOISE: "MANEKKO",
    BGN: "MANEKKO",
    SOLFAGE:"MANEKKO",
    MANE:"MANEKKO",
    MANEKKO:"MANEKKO"
  },
  previousCmd: {
    SINEWAVE: false,
    WHITENOISE: false,
    FEEDBACK: false,
    BASS: false,
    CHAT: false,
    PLAYBACK: false,
    TIMELAPSE: false,
    FILE: false,
    DRUM: false,
    SILENCE: false,
    RECORD: false,
    SWITCH: false,
    KICK: false,
    SNARE: false,
    HAT: false,
    FAN: false
  },
  mute: false,
  PORTAMENT: 0,
  FADE: {
    IN: 0,
    OUT: 0
  },
  prevCmd: "",
  prevTime: "",
  streamProcess: {
    CHAT: false,
    DRUM: false,
    SILENCE: false,
    PLAYBACK: false,
    TIMELAPSE: false
  },
  streamList: {
    CHAT: "CHAT",
    VIDEOCHAT: "CHAT",
    DRUM: "DRUM",
    SILENCE: "SILENCE",
    PLAYBACK: "PLAYBACK",
    PLAY: "PLAYBACK",
    TIMELAPSE: "TIMELAPSE",
    LAPSE: "TIMELAPSE"
  },
  sampleRate: {
    CHAT: 44100,
    DRUM: 44100,
    SILENCE: 44100,
    PLAYBACK: 44100,
    TIMELAPSE: 44100
  },
  timer: {
    CHAT: false,
    DRUM: false,
    SILENCE: false,
    PLAYBACK: false,
    TIMELAPSE: false
  },
  latency: {
    CHAT: 0,
    DRUM: 0,
    SILENCE: 0,
    PLAYBACK: 0,
    TIMELAPSE: 0 
  },
  glitch: {
    CHAT: false,
    DRUM: false,
    SILENCE: false,
    PLAYBACK: false,
    TIMELAPSE: false
  },
  grid: {
    CHAT: false,
    DRUM: false,
    SILENCE: false,
    PLAYBACK: false,
    TIMELAPSE: false
  },
  chatSequence: false,
  quantize: false,
  emitMode: "NORMAL",
  waitCHAT: false,
  cutup: false,
  record: false
};

export const buffState: buffArrayType = {
  KICK: {
    audio: [],
    video: [],
    index: 0
  },
  SNARE: {
    audio: [],
    video: [],
    index: 0
  },
  HAT: {
    audio: [],
    video: [],
    index: 0
  },
  SILENCE: {
    audio: [],
    video: [],
    index: 0
  },
  CHAT: {
    audio: [],
    video: [],
    index: 0
  },
  PLAYBACK: {
    audio: [],
    video: [],
    index: 0
  },
  TIMELAPSE: {
    audio: [],
    video: [],
    index: 0
  },
};