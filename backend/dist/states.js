"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadParams = exports.parameterList = exports.streamList = exports.cmdList = exports.chat_web = exports.streams = exports.basisBufferSize = exports.states = exports.faceState = void 0;
exports.faceState = {
    flag: false,
    previousFace: {
        x: 0,
        y: 0,
    },
    expression: "no expression",
};
exports.states = {
    cmd: {
        GAIN: {
            MASTER: 1.0,
            SINEWAVE: 0.4,
            FEEDBACK: 1,
            WHITENOISE: 1.0,
            CLICK: 0.9,
            BASS: 1.5,
            CHAT: 1.5,
            GLITCH: 2,
            SIMULATE: 1.0,
            METRONOME: 0.9,
        },
        FADE: {
            IN: 0,
            OUT: 0,
        },
        SINEWAVE: {},
        PORTAMENT: 0,
        VOICE: [],
        voiceLang: "en-US",
        METRONOME: {},
    },
    client: [],
    current: {
        cmd: {
            FEEDBACK: [],
            WHITENOISE: [],
            CLICK: [],
            BASS: [],
            METRONOME: [],
        },
        sinewave: {},
        stream: {
            CHAT: false,
            PLAYBACK: false,
            TIMELAPSE: false,
        },
        RECORD: false,
    },
    previous: {
        text: "",
        cmd: {
            FEEDBACK: [],
            WHITENOISE: [],
            CLICK: [],
            BASS: [],
            METRONOME: [],
        },
        sinewave: {},
        stream: {
            CHAT: false,
            PLAYBACK: false,
            TIMELAPSE: false,
        },
        RECORD: false,
    },
    stream: {
        sampleRate: {
            CHAT: 44100,
            PLAYBACK: 44100,
            TIMELAPSE: 44100,
            EMPTY: 44100,
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
            TIMELAPSE: false,
        },
        quantize: false,
        loop: false,
        timelapse: false,
    },
    web: {
        flag: false,
        type: "websocket",
        url: "ws://chat.knd.cloud/ws/",
    },
    bpm: {},
};
exports.basisBufferSize = 8192;
exports.streams = {
    CHAT: [],
    KICK: {
        audio: [],
        video: [],
        bufferSize: exports.basisBufferSize,
    },
    SNARE: {
        audio: [],
        video: [],
        bufferSize: exports.basisBufferSize,
    },
    HAT: {
        audio: [],
        video: [],
        bufferSize: exports.basisBufferSize,
    },
    SILENCE: {
        audio: [],
        video: [],
        bufferSize: exports.basisBufferSize,
    },
    PLAYBACK: [],
    TIMELAPSE: {
        audio: [],
        video: [],
        index: 0,
        bufferSize: exports.basisBufferSize,
    },
    INTERNET: {
        audio: [],
        video: [],
        index: 0,
    },
    EMPTY: {
        audio: [],
        video: [],
        index: [],
    },
};
exports.chat_web = true;
exports.cmdList = {
    FEEDBACK: "FEEDBACK",
    FEED: "FEEDBACK",
    WHITENOISE: "WHITENOISE",
    NOISE: "WHITENOISE",
    CLICK: "CLICK",
    BASS: "BASS",
    SIMULATE: "SIMULATE",
    SIMS: "SIMULATE",
    METRONOME: "METRONOME",
    PREVIOUS: "PREVIOUS",
    PREV: "PREVIOUS",
};
exports.streamList = ["PLAYBACK", "TIMELAPSE", "EMPTY"];
exports.parameterList = {
    PORTAMENT: "PORTAMENT",
    PORT: "PORTAMENT",
    SAMPLERATE: "SAMPLERATE",
    RATE: "SAMPLERATE",
    BPM: "BPM",
    GLITCH: "GLITCH",
    GRID: "GRID",
    VOICE: "VOICE",
    RANDOM: "RANDOM",
};
exports.uploadParams = {
    mediaDir: "./upload/",
    ss: "00:00:00",
    t: "00:00:20",
};
//# sourceMappingURL=states.js.map