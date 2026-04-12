// stream.client = {flag, bpm, beat}

export type cmdStateType = {
  GAIN: {
    MASTER: number;
    SINEWAVE: number;
    FEEDBACK: number;
    WHITENOISE: number;
    CLICK: number;
    BASS: number;
    CHAT: number;
    GLITCH: number;
    SIMULATE: number;
    METRONOME: number;
  };
  FADE: {
    IN: number;
    OUT: number;
  };
  SINEWAVE: {
    [key: string]: number;
  };
  PORTAMENT: number;
  VOICE: Array<string>;
  voiceLang: string;
  METRONOME: {
    [key: string]: number;
  };
};

export type streamStateType = {
  basisBufferSize: number;
  random: {
    [key: string]: boolean;
  };
  grid: {
    [key: string]: boolean;
  };
  target: {
    [key: string]: Array<string>;
  };
  filter: {
    [key: string]: filterStateType;
  };
  loop: boolean;
  timelapse: boolean;
  timelapseInterval: NodeJS.Timeout | null;
  timelapseIntervalValue: number;
  floating: boolean;
  pa: {
    [key: string]: boolean;
  };
};

export type filterStateType = {
  flag: boolean;
  type:
    | "lowpass"
    | "highpass"
    | "bandpass"
    | "lowshelf"
    | "highshelf"
    | "peaking"
    | "notch"
    | "allpass";
  frequency: number;
  Q: number;
  gain: number;
};

export type glitchStateType = {
  glitch: {
    [key: string]: boolean;
  };
  glitchSampleRate: number;
};

export type sampleRateStateType = {
  sampleRate: {
    [key: string]: number;
  };
  randomrate: {
    [key: string]: boolean;
  };
  randomraterange: {
    [key: string]: {
      min: number;
      max: number;
    };
  };
  randomratemode: "diatonic" | "serial" | "random" | "randomrange";
  randomratekey: string;
  randomratenote: {
    [key: string]: boolean;
  };
};

export type clientStateType = {
  client: {
    [key: string]: {
      ipAddress: string;
      urlPathName: string;
      projection: boolean;
      stream: boolean;
      mobile: boolean;
      position: {
        top: number;
        left: number;
        width: number;
        height: number;
      };
      self: boolean;
      snowLeopard: boolean;
    };
  };
  cmdClient: string[];
  streamClient: string[];
  sinewaveClient: string[];
  paCmdClient: string[];
  paStreamClient: string[];
};

export type currentStateType = {
  cmd: {
    FEEDBACK: Array<string>; // 発音しているIDの配列にする
    WHITENOISE: Array<string>;
    CLICK: Array<string>; // 管理する意味なさそう…
    BASS: Array<string>;
    METRONOME: Array<string>;
  };
  sinewave: {
    [key: string]: number;
  };
  stream: {
    [key: string]: boolean;
  };
  RECORD: boolean;
};

export type previousStateType = {
  text: string;
  cmd: {
    FEEDBACK: Array<string>; // 発音しているIDの配列にする
    WHITENOISE: Array<string>;
    CLICK: Array<string>; // 管理する意味なさそう…
    BASS: Array<string>;
    METRONOME: Array<string>;
  };
  sinewave: {
    [key: string]: number;
  };
  stream: {
    [key: string]: boolean;
  };
  RECORD: boolean;
};

export type formStateType = {
  cmd: {
    [key: string]: string;
  };
};

export type webStateType = {
  flag: boolean;
  type: string;
  url: string;
};

export type bpmStateType = {
  client: { [key: string]: number };
  stream: { [key: string]: number };
  METRONOME: number;
  MODULATION: number;
};

export type flagStateType = {
  clockMode: boolean;
  emoji: boolean;
  timer: boolean;
  vosk: boolean;
};

export type arduinoStateType = {
  host: string;
  port: number;
  connected: boolean;
  relay: "on" | "off";
};
