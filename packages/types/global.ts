export type cmdStateType_old = {
  client: {
    [key: string]: {
      ipAddress: string;
      urlPathName: string;
      projection: boolean;
      stream: boolean;
      position: {
        top: number;
        left: number;
        width: number;
        height: number;
      };
    };
  };
  cmdClient: string[];
  streamClient: string[];
  sinewaveClient: Array<string>;
  current: {
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
  previous: {
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
  cmd: {
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
  form: {
    hls: {
      [key: string]: string;
    };
    cmd: {
      [key: string]: string;
    };
  };
  stream: {
    basisBufferSize: number;
    sampleRate: {
      [key: string]: number;
    };
    random: {
      [key: string]: boolean;
    };
    grid: {
      [key: string]: boolean;
    };
    glitch: {
      [key: string]: boolean;
    };
    target: {
      [key: string]: Array<string>;
    };
    glitchSampleRate: number;
    latency: {
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
    quantize: {
      flag: {
        stream: {
          [key: string]: boolean;
        };
        client: {
          [key: string]: boolean;
        };
      };
      bpm: {
        [key: string]: {
          [key: string]: number;
        };
      };
      beat: {
        [key: string]: {
          [key: string]: number;
        };
      };
    };
    loop: boolean;
    timelapse: boolean;
    floating: boolean;
  };
  web: {
    flag: boolean;
    type: string;
    url: string;
  };
  bpm: {
    [key: string]: number;
  };
  clockMode: boolean;
  arduino: {
    host: string;
    port: number;
    connected: boolean;
    relay: "on" | "off";
  };
  emoji: boolean;
  timer: boolean;
  hls: string[];
};

/*

export type cmdStateType = {
  cmdProcess: {
    [key: string]: boolean
  },
  cmdList: {
    [key: string]: string
  }
  previousCmd: {
    [key: string]: boolean
  },
  mute: boolean,
  PORTAMENT: number,
  FADE: {
    IN: number,
    OUT: number
  },
  prevCmd: string,
  prevTime: string,
  streamProcess: {
    [key: string]: boolean
  },
  streamList: {
    [key: string]: string
  },
  sampleRate: {
    [key: string]: number
  },
  timer: {
    [key: string]: boolean
  },
  latency: {
    [key: string]: number
  },
  glitch: {
    [key: string]: boolean
  },
  grid: {
    [key: string]: boolean
  },
  chatSequence: boolean,
  quantize: boolean,
  emitMode: string,
  waitCHAT: boolean,
  cutup: boolean,
  record: boolean
}

export type buffArrayType = {
  KICK: {
    audio: Array<Float32Array>,
    video: Array<string>,
    index: number
  },
  SNARE: {
    audio: Array<Float32Array>,
    video: Array<string>,
    index: number
  },
  HAT: {
    audio: Array<Float32Array>,
    video: Array<string>,
    index: number
  },
  SILENCE: {
    audio: Array<Float32Array>,
    video: Array<string>,
    index: number
  },
  CHAT: {
    audio: Array<Float32Array>,
    video: Array<string>,
    index: number
  },
  PLAYBACK: {
    audio: Array<Float32Array>,
    video: Array<string>,
    index: number
  },
  TIMELAPSE: {
    audio: Array<Float32Array>,
    video: Array<string>,
    index: number
  },
}
*/

// export type cmdLogType = {
//   [key: string]: string;
// }[];
