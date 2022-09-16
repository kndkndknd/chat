import { cmdStateType } from '../types/global'

export const states: cmdStateType = {
  cmd: {
    GAIN: {
      MASTER: 1.0,
      SINEWAVE:0.9,
      FEEDBACK:1,
      WHITENOISE:1.0,
      CLICK:0.9,
      BASS:1.5,
      CHAT:1.5,
      GLITCH:2,
      SIMULATE: 1.0
    },
    FADE: {
      IN:0,
      OUT:0,
    },
    SINEWAVE: {
    },
    PORTAMENT: 0,
    VOICE: []
  },
  client: [],
  current: {
    cmd: {
      FEEDBACK: [],
      WHITENOISE: [],
      CLICK: [],
      BASS: []
    },
    sinewave: {},
    stream:{
      CHAT: false,
      PLAYBACK: false,
      TIMELAPSE: false
    },
    RECORD: false
  },
  previous: {
    cmd: {
      FEEDBACK: [],
      WHITENOISE: [],
      CLICK: [],
      BASS: []
    },
    sinewave: {},
    stream:{
      CHAT: false,
      PLAYBACK: false,
      TIMELAPSE: false
    },
    RECORD: false
  },
  stream: {
    sampleRate: {
      CHAT: 44100,
      PLAYBACK: 44100,
      TIMELAPSE: 44100,
      EMPTY: 444100
    },
    random: {
      CHAT: false,
      PLAYBACK: false,
      TIMELAPSE: false,
    },
    grid: {
      CHAT: false,
      PLAYBACK: false,
      TIMELAPSE: false,
    },
    glitch: {
      CHAT: false,
      PLAYBACK: false,
      TIMELAPSE: false,
    },
    glitchSampleRate: 96000,
    latency: {
      CHAT: 1000,
      PLAYBACK: 1000,
      TIMELAPSE: 1000,
    },
    randomrate: {
      CHAT: false,
      PLAYBACK: false,
      TIMELAPSE: false
    },
    quantize: false,
    loop: false,
    timelapse: false,
  },
  web: {
    flag: false,
    type: "websocket",
    url: "ws://chat.knd.cloud/ws/"
  }
}

export let basisBufferSize = 8192

export const streams = {
  "CHAT": [],
  "KICK": {
    "audio": [],
    "video": [],
    "bufferSize": basisBufferSize
  },
  "SNARE": {
    "audio": [],
    "video": [],
    "bufferSize": basisBufferSize
  },
  "HAT": {
    "audio": [],
    "video": [],
    "bufferSize": basisBufferSize
  },
  "SILENCE": {
    "audio": [],
    "video": [],
    "bufferSize": basisBufferSize
  },
  "PLAYBACK": [],
  "TIMELAPSE": {
    "audio": [],
    "video": [],
    "index": 0,
    "bufferSize": basisBufferSize
  },
  "INTERNET": {
    "audio": [],
    "video": [],
    "index": 0
  },
  "EMPTY" : {
    "audio": [],
    "video": [],
    "index": []
  }
}

export const chat_web = true



export const cmdList = {
  'FEEDBACK': 'FEEDBACK',
  'FEED': 'FEEDBACK',
  'WHITENOISE': 'WHITENOISE',
  'NOISE': 'WHITENOISE',
  'CLICK': 'CLICK',
  'BASS': 'BASS',
  'SIMULATE': 'SIMULATE',
  'SIMS': 'SIMULATE'
}

export let streamList = ['PLAYBACK', 'TIMELAPSE', 'EMPTY']

export const parameterList = {
  'PORTAMENT': 'PORTAMENT', // 引数が前提 単体は0なら5、0以外なら0
  'PORT': 'PORTAMENT',
  'SAMPLERATE': 'SAMPLERATE', 
  'RATE': 'SAMPLERATE',
  'BPM': 'BPM',
  'GLITCH': 'GLITCH', // 単体でも使える、引数もありうる
  'GRID': 'GRID', // ほぼ単体使いな気がするが、STREAM指定できたらそれはそれで
  'VOICE': 'VOICE', // 単体。引数にするとしたら1 VOICEのような形だと思う
  'RANDOM': 'RANDOM'
}

export const uploadParams =  {
  mediaDir: './upload/',
  ss: '00:00:00',
  t: '00:00:20'
}