
export type buffStateType = {
  target: string, 
  audio: Float32Array, 
  video: string, 
  bufferSize: number, 
  duration: number
}


export type cmdType = {
  cmd: string,
  property?: string,
  value?: string,
  flag?: boolean
}



export type cmdStateType = {
  client: Array<string>,
  current: {
    cmd: {
      FEEDBACK: Array<string>, // 発音しているIDの配列にする
      WHITENOISE: Array<string>,
      CLICK: Array<string>, // 管理する意味なさそう…
      BASS: Array<string>
      METRONOME: Array<string>
    },
    sinewave: {
      [key: string]: number
    },
    stream: {
      [key: string]: boolean
    },
    RECORD: boolean
  },
  previous: {
    cmd: {
      FEEDBACK: Array<string>, // 発音しているIDの配列にする
      WHITENOISE: Array<string>,
      CLICK: Array<string>, // 管理する意味なさそう…
      BASS: Array<string>,
      METRONOME: Array<string>
    },
    sinewave: {
      [key: string]: number
    },
    stream: {
      [key: string]: boolean
    },
    RECORD: boolean
  }
  cmd: {
    GAIN: {
      MASTER: number,
      SINEWAVE:number,
      FEEDBACK:number,
      WHITENOISE:number,
      CLICK:number,
      BASS:number,
      CHAT:number,
      GLITCH:number,
      SIMULATE:number,
      METRONOME: number,
    },
    FADE: {
      IN:number,
      OUT:number,
    },
    SINEWAVE: {
      [key: string]: number
    },
    PORTAMENT: number,
    VOICE: Array<string>,
    voiceLang: string,
    METRONOME: {
      [key: string]: number
    }
  },
  stream: {
    sampleRate: {
      [key: string]: number
    },
    random: {
      [key: string]: boolean
    },
    grid: {
      [key: string]: boolean
    },
    glitch: {
      [key: string]: boolean
    },
    glitchSampleRate: number,
    latency: {
      [key: string]: number
    },
    randomrate: {
      [key: string]: boolean
    }
    quantize: boolean,
    loop: boolean,
    timelapse: boolean,
  },
  web: {
    flag: boolean,
    type: string,
    url: string
  }
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

export type sevenSinsType = "pride" | "greed" | "envy" | "wrath" | "lust" | "gluttony" | "sloth" | "no expression"

export type newWindowReqType = {
  URL: string,
  width: number,
  height: number,
  top: number,
  left: number
}