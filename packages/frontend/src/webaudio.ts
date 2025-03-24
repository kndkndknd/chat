import { io, Socket } from "socket.io-client";
import { erasePrint, textPrint, toBase64, showImage } from "./imageEvent";
import { cnvs, ctx } from "./globalVariable";
import { hlsVideoStop } from "./hlsVideo";
import { frontState } from "./globalVariable";

let simsGain = 1;
let chatGainVal = 1.5;
let glitchGainVal = 1.5;

let metronomeIntervId: number;

// const cnvs = <HTMLCanvasElement> document.getElementById('cnvs');
// const ctx  = <CanvasRenderingContext2D>cnvs.getContext('2d');

const socket: Socket = io();
let socketId: string;

let audioContext: AudioContext;
let masterGain: GainNode;
let javascriptnode: ScriptProcessorNode;
let osc: OscillatorNode;
let oscGain: GainNode;
let feedbackGain: GainNode;
let whitenoiseOsc: OscillatorNode;
let whitenoiseNode: ScriptProcessorNode;
let noiseGain: GainNode;
let buf0: Float32Array;
let buf1: Float32Array;
let bassOsc: OscillatorNode;
let bassGain: GainNode;
let clickOsc: OscillatorNode;
let clickGain: GainNode;

let chatGain: GainNode;

let convolver: ConvolverNode;
let glitchGain: GainNode;

let feedbackReverve: ConvolverNode;
let feedbackReverveGain: GainNode;

let simulateOsc: OscillatorNode;
let simulateGain: GainNode;
let simFilter: BiquadFilterNode;
let analyser: AnalyserNode;

let threeOsc: OscillatorNode;
let threeGain: GainNode;

export const initAudio = () => {
  // console.log("debug1");
  audioContext = new AudioContext();
  masterGain = audioContext.createGain();
  masterGain.gain.setValueAtTime(1, 0);
  masterGain.connect(audioContext.destination);
  // console.log(masterGain.gain.maxValue);

  //record/play
  // javascriptnode = audioContext.createScriptProcessor(8192, 1, 1);
  // sinewave
  osc = audioContext.createOscillator();
  oscGain = audioContext.createGain();
  osc.connect(oscGain);
  osc.frequency.setValueAtTime(440, 0);
  oscGain.gain.setValueAtTime(0, 0);
  oscGain.connect(masterGain);
  osc.start(0);

  // feedback
  feedbackGain = audioContext.createGain();
  feedbackGain.gain.setValueAtTime(0, 0);
  //whitenoise
  whitenoiseOsc = audioContext.createOscillator();
  whitenoiseNode = audioContext.createScriptProcessor(1024);
  noiseGain = audioContext.createGain();
  noiseGain.gain.setValueAtTime(0, 0);
  whitenoiseNode.onaudioprocess = (ev) => {
    buf0 = ev.outputBuffer.getChannelData(0);
    buf1 = ev.outputBuffer.getChannelData(1);
    for (let i = 0; i < 1024; ++i) {
      buf0[i] = buf1[i] = Math.random() - 0.5;
    }
  };
  whitenoiseOsc.connect(whitenoiseNode);
  whitenoiseNode.connect(noiseGain);
  noiseGain.connect(masterGain);
  whitenoiseOsc.start(0);

  //bass
  bassOsc = audioContext.createOscillator();
  bassGain = audioContext.createGain();
  bassOsc.connect(bassGain);
  bassOsc.frequency.setValueAtTime(88, 0);
  bassGain.gain.setValueAtTime(0, 0);
  bassGain.connect(masterGain);
  bassOsc.start(0);

  //click
  clickOsc = audioContext.createOscillator();
  clickGain = audioContext.createGain();
  clickOsc.connect(clickGain);
  clickOsc.frequency.setValueAtTime(440, 0);
  clickGain.gain.setValueAtTime(0, 0);
  clickGain.connect(masterGain);
  clickOsc.start(0);

  // chat / feedback
  javascriptnode = audioContext.createScriptProcessor(8192, 1, 1);
  convolver = audioContext.createConvolver();
  glitchGain = audioContext.createGain();
  glitchGain.gain.setValueAtTime(glitchGainVal, 0);
  convolver.connect(glitchGain);
  glitchGain.connect(audioContext.destination);

  feedbackGain = audioContext.createGain();
  feedbackGain.gain.setValueAtTime(0, 0);
  feedbackReverveGain = audioContext.createGain();
  feedbackReverveGain.gain.setValueAtTime(0, 0);
  feedbackReverve = audioContext.createConvolver();
  feedbackReverve.connect(feedbackReverveGain);

  chatGain = audioContext.createGain();
  chatGain.gain.setValueAtTime(chatGainVal, 0);
  chatGain.connect(masterGain);

  // SIMULATE
  simulateOsc = audioContext.createOscillator();
  simulateGain = audioContext.createGain();
  simulateOsc.connect(simulateGain);
  simulateOsc.frequency.setValueAtTime(440, 0);
  simulateGain.gain.setValueAtTime(0, 0);
  simulateGain.connect(masterGain);
  simulateOsc.start(0);
  simFilter = audioContext.createBiquadFilter();
  simFilter.type = "lowpass";
  simFilter.frequency.setValueAtTime(1000, 0);

  // THREE
  threeOsc = audioContext.createOscillator();
  threeOsc.type = "square";
  threeGain = audioContext.createGain();
  threeOsc.connect(threeGain);
  threeOsc.frequency.setValueAtTime(0, 0);
  threeGain.gain.setValueAtTime(1, 0);
  threeGain.connect(masterGain);
  threeOsc.start(0);
};

export const initAudioStream = (stream) => {
  let mediastreamsource: MediaStreamAudioSourceNode;
  mediastreamsource = audioContext.createMediaStreamSource(stream);
  mediastreamsource.connect(javascriptnode);
  mediastreamsource.connect(feedbackGain);
  mediastreamsource.connect(feedbackReverveGain);
  feedbackGain.connect(masterGain);
  javascriptnode.onaudioprocess = onAudioProcess;
  javascriptnode.connect(masterGain);
  //rec

  //SIMULATE
  analyser = audioContext.createAnalyser();
  mediastreamsource.connect(simFilter);
  simFilter.connect(analyser);
};

const onAudioProcess = (e: AudioProcessingEvent) => {
  const bufferSize = 8192;
  if (frontState.chatFlag) {
    let bufferData = {
      source: "CHAT",
      video: toBase64(),
      audio: new Float32Array(bufferSize),
      bufferSize: bufferSize,
      duration: e.inputBuffer.duration,
    };
    e.inputBuffer.copyFromChannel(bufferData.audio, 0);
    // console.log(bufferData.audio)
    // console.log("socket.id(chatFromClient)", socket.id);
    if (socketId !== "") {
      bufferData["from"] = socketId;
    }
    socket.emit("chatFromClient", bufferData);
    console.log("chatFromClient emit");
    frontState.chatFlag = false;
  }
  if (frontState.recordFlag) {
    // console.log("record");
    let bufferData = {
      source: "PLAYBACK",
      video: toBase64(),
      audio: new Float32Array(bufferSize),
      bufferSize: bufferSize,
      duration: e.inputBuffer.duration,
    };
    e.inputBuffer.copyFromChannel(bufferData.audio, 0);
    // console.log(bufferData);
    socket.emit("chatFromClient", bufferData);
  }
  if (frontState.otherStreamFlag !== "") {
    // console.log(frontState.otherStreamFlag);
    let bufferData = {
      source: frontState.otherStreamFlag,
      video: toBase64(),
      audio: new Float32Array(bufferSize),
      bufferSize: bufferSize,
      duration: e.inputBuffer.duration,
    };
    e.inputBuffer.copyFromChannel(bufferData.audio, 0);
    console.log(bufferData);
    socket.emit("chatFromClient", bufferData);
  }
  if (frontState.timelapseFlag) {
    let bufferData = {
      source: "TIMELAPSE",
      video: toBase64(),
      audio: new Float32Array(bufferSize),
      bufferSize: bufferSize,
      duration: e.inputBuffer.duration,
    };
    e.inputBuffer.copyFromChannel(bufferData.audio, 0);
    // console.log(bufferData.audio)
    // console.log("socket.id(chatFromClient)", socket.id);
    socket.emit("chatFromClient", bufferData);
    frontState.timelapseFlag = false;
  }
  if (frontState.simulate) {
    let freqData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(freqData);
    // console.log(freqData.length);
    let freq = { freq: 0, val: 0 };
    for (let i = 0, len = freqData.length; i < len; i++) {
      //if(freq.val < freqData[i]) freq = {freq:(i*20000/2048), val:freqData[i]/256}
      if (freq.val < freqData[i])
        freq = { freq: (i * 22050) / analyser.fftSize, val: freqData[i] / 256 };
    }
    //let currentTime = audioContext.currentTime
    if (freq.val > simsGain) freq.val = simsGain;
    //    freq.val = simsGain
    //    freq.val //later
    //    if(freq.val > clientState.gain.manekkoGain) freq.val = clientState.gain.manekkoGain
    // console.log(freq);
    let currentTime = audioContext.currentTime;
    simulateGain.gain.setTargetAtTime(freq.val, currentTime, 0.1);
    simulateOsc.frequency.setTargetAtTime(freq.freq, currentTime, 0.1);
    erasePrint(ctx, cnvs);
    textPrint(String(freq.freq) + "Hz", ctx, cnvs);
  }
};

export const playAudioStream = (
  bufferArray: Float32Array,
  sampleRate: number,
  glitch: boolean,
  bufferSize: number
) => {
  // console.log(sampleRate);
  // console.log(bufferSize);
  // console.log(bufferArray);

  let audio_src = audioContext.createBufferSource();
  const flo32arr = new Float32Array(bufferArray);
  let audioData = new Float32Array(bufferSize);
  for (let i = 0; i < bufferSize; i++) {
    if (flo32arr[i]) {
      audioData[i] = flo32arr[i];
      // audioData[i] = 1.0
    } else {
      audioData[i] = 0.0;
    }
  }
  // console.log(sampleRate);
  // console.log(bufferSize);
  // console.log(audioData)
  if (!glitch) {
    let audio_buf = audioContext.createBuffer(1, bufferSize, sampleRate);
    audio_buf.copyToChannel(audioData, 0);
    audio_src.buffer = audio_buf;
    audio_src.connect(chatGain);
  } else {
    // console.log("glitched");
    let audio_buf = audioContext.createBuffer(
      1,
      bufferSize,
      convolver.context.sampleRate
    );
    audio_buf.copyToChannel(audioData, 0);

    audio_src.buffer = audio_buf;
    convolver.buffer = audio_buf;
    audio_src.connect(convolver);
  }
  audio_src.start(0);
};

export const sinewave = (
  flag: boolean,
  frequency: number,
  fade: number,
  portament: number,
  gain: number
) => {
  console.log("debug3");
  const currentTime = audioContext.currentTime;
  console.log("debug");
  osc.frequency.setTargetAtTime(frequency, currentTime, portament);
  if (flag) {
    oscGain.gain.setTargetAtTime(gain, currentTime, fade);
  } else {
    oscGain.gain.setTargetAtTime(0, currentTime, fade);
  }
};

export const whitenoise = (flag: boolean, fade: number, gain: number) => {
  const currentTime = audioContext.currentTime;

  console.log("currentTime", currentTime);
  console.log("fade", fade);
  console.log("gain", gain);
  if (flag) {
    noiseGain.gain.setTargetAtTime(gain, currentTime, fade);
  } else {
    noiseGain.gain.setTargetAtTime(0, currentTime, fade);
  }
};

export const feedback = (
  flag: boolean,
  fade: number,
  gain: number,
  type?: "normal" | "reverve"
) => {
  const currentTime = audioContext.currentTime;
  // if (type === undefined || type === "normal") {
  if (flag) {
    feedbackGain.gain.setTargetAtTime(gain, currentTime, fade);
  } else {
    feedbackGain.gain.setTargetAtTime(0, currentTime, fade);
  }
  // } else if (type === "reverve") {
  // if (flag) {
  //   feedbackReverveGain.gain.setTargetAtTime(gain, currentTime, fade);
  // } else {
  //   feedbackReverveGain.gain.setTargetAtTime(gain, currentTime, fade);
  // }
  // }
};

export const bass = (flag: boolean, gain: number) => {
  if (flag) {
    const freq = setBassNote();
    console.log(freq);
    bassOsc.frequency.setValueAtTime(freq, 0);
    bassGain.gain.setValueAtTime(gain, 0);
  } else {
    bassGain.gain.setValueAtTime(0, 0);
  }
};

const setBassNote = () => {
  let random = Math.random();
  // let note = ''
  let freq = 55;
  const bassNote = [
    { note: "A", freq: 55, probability: 0.45 },
    { note: "C", freq: 65.406, probability: 0.5 },
    { note: "D", freq: 73.416, probability: 0.7 },
    { note: "E", freq: 82.407, probability: 0.85 },
    { note: "G", freq: 97.999, probability: 0.9 },
    { note: "A", freq: 110, probability: 1 },
  ];
  // randomがbassNoteの各要素のprobabilityより小さい場合、その要素のfreqを返す
  for (let i = 0; i < bassNote.length; i++) {
    if (random < bassNote[i].probability) {
      freq = bassNote[i].freq;
      break;
    }
  }
  return freq;
};

export const click = (gain: number, frequency?: number) => {
  const currentTime = audioContext.currentTime;
  if (frequency) {
    clickOsc.frequency.setValueAtTime(frequency, 0);
  } else {
    clickOsc.frequency.setValueAtTime(440, 0);
  }
  clickGain.gain.setValueAtTime(gain, 0);
  clickGain.gain.setTargetAtTime(0, currentTime, 0.03);
};

export const chatReq = (id: string) => {
  // textPrint("chat req", ctx, cnvs);
  frontState.chatFlag = true;
  if (id !== undefined && id) {
    socketId = id;
  }
};

export const recordReq = (recordReq: { source: string; timeout: number }) => {
  console.log(recordReq);
  switch (recordReq.source) {
    case "PLAYBACK":
      frontState.recordFlag = true;
      setTimeout(() => {
        frontState.recordFlag = false;
      }, recordReq.timeout);
      break;
    default:
      console.log("other");
      frontState.otherStreamFlag = recordReq.source;
      setTimeout(() => {
        frontState.otherStreamFlag = "";
      }, recordReq.timeout);
      break;
  }
};

//video record/play ここまで

export const stopCmd = (fade: number, except?: string) => {
  const currentTime = audioContext.currentTime;
  if (except !== "BASS") {
    bassGain.gain.setValueAtTime(0, 0);
  }
  if (except !== "FEEDBACK") {
    feedbackGain.gain.setTargetAtTime(0, currentTime, fade);
  }
  if (except !== "WHITENOISE") {
    noiseGain.gain.setTargetAtTime(0, currentTime, fade);
  }
  if (except !== "SINEWAVE") {
    oscGain.gain.setTargetAtTime(0, currentTime, fade);
  }
  if (except !== "SIMULATE") {
    simulateGain.gain.setTargetAtTime(0, currentTime, fade);
  }
  if (metronomeIntervId && except !== "METRONOME") {
    clearInterval(metronomeIntervId);
  }
  if (except !== "HLS") {
    hlsVideoStop();
  }
  frontState.simulate = false;
  for (let key in frontState.streamFlag) {
    frontState.streamFlag[key] = false;
  }
  // const hlsVideo = document.getElementById("hls") as HTMLVideoElement;
};

export const simulate = (gain: number) => {
  frontState.simulate = !frontState.simulate;
  if (frontState.simulate) {
    simsGain = gain;
  } else {
    simsGain = 0;
    simulateGain.gain.setValueAtTime(0, 0);
  }
};

export const metronome = (flag: boolean, latency: number, gain: number) => {
  if (!metronomeIntervId) {
    console.log("metronome init");
    textPrint("METRONOME", ctx, cnvs);
    metronomeIntervId = window.setInterval(() => {
      console.log("metronome");
      console.log(gain);
      click(gain);
      textPrint("CLICK", ctx, cnvs);
      setTimeout(() => {
        erasePrint(ctx, cnvs);
      }, 500);
    }, latency);
  } else if (flag) {
    textPrint("METRONOME", ctx, cnvs);
    console.log("metronome change");
    clearInterval(metronomeIntervId);
    metronomeIntervId = window.setInterval(() => {
      click(gain);
      textPrint("CLICK", ctx, cnvs);
      setTimeout(() => {
        erasePrint(ctx, cnvs);
      }, 500);
    }, latency);
  } else {
    console.log("metronome stop");
    clearInterval(metronomeIntervId);
  }
};

var isInitialized = false;
var audioctx, buffer;
var src, overdrive, vol, feedbackAudioWorklet;

export const initAudioWorklet = async (stream) => {
  console.log("debug2");
  let mediastreamsource: MediaStreamAudioSourceNode;
  await audioContext.audioWorklet.addModule(
    "audioWorkletProcessor/feedback.js"
  );
  mediastreamsource = audioContext.createMediaStreamSource(stream);
  feedbackAudioWorklet = new AudioWorkletNode(audioContext, "Feedback");
  // overdrive.drive = overdrive.parameters.get("drive");
  // overdrive.drive.value = 0.5
  vol = new GainNode(audioContext, { gain: 0.5 });
  // analyser = new AnalyserNode(audioctx);
  src = new AudioBufferSourceNode(audioctx, { buffer: buffer, loop: true });
  src.connect(feedbackAudioWorklet).connect(vol).connect(audioctx.destination);

  // mediastreamsource.connect(javascriptnode)
  // mediastreamsource.connect(feedbackGain)
  // feedbackGain.connect(masterGain)

  // javascriptnode.onaudioprocess = onAudioProcess
  // javascriptnode.connect(masterGain)
};

export const initOverDrive = async () => {
  audioctx = new AudioContext();
  buffer = await LoadSample(audioctx, "loop.wav");
  await audioctx.audioWorklet.addModule("overdrive-proc.js");
  overdrive = new AudioWorkletNode(audioctx, "OverDrive");
  overdrive.drive = overdrive.parameters.get("drive");
  overdrive.drive.value = 0.5;
  vol = new GainNode(audioctx, { gain: 0.5 });
  analyser = new AnalyserNode(audioctx);
  src = new AudioBufferSourceNode(audioctx, { buffer: buffer, loop: true });
  src
    .connect(overdrive)
    .connect(vol)
    .connect(analyser)
    .connect(audioctx.destination);
  Setup();
  src.start();
  isInitialized = true;
  Play();
};

export const threeOscFreq = (dist: number) => {
  if (!isNaN(dist)) {
    threeOsc.frequency.setTargetAtTime(dist * 44, 0, 0);
  }
};

export const gainChange = (data) => {
  const currentTime = audioContext.currentTime;
  masterGain.gain.setTargetAtTime(data.MASTER, currentTime, 0);
  simsGain = data.SIMULATE;
  chatGainVal = data.CHAT;
  glitchGainVal = data.GLITCH;
  chatGain.gain.setTargetAtTime(data.CHAT, currentTime, 0);
  glitchGain.gain.setTargetAtTime(data.GLITCH, currentTime, 0);
};

function Stop() {
  if (src) src.stop();
  src = null;
}

function Play() {
  if (!src) {
    src = audioctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.connect(overdrive);
    src.start();
  }
}

function LoadSample(ctx, url) {
  return new Promise((resolv) => {
    fetch(url)
      .then((res) => {
        return res.arrayBuffer();
      })
      .then((ar) => {
        return ctx.decodeAudioData(ar);
      })
      .then((buf) => {
        resolv(buf);
      });
  });
}

function Setup() {
  var driveval = 0.8;
  console.log(driveval);
  overdrive.drive.value = driveval;
  vol.gain.value = 1;
}

// let quantizeInterval: number;
// let quantizerCurrentTime: number = 0;
let eighthNoteSec: number = 0;

export const quantize = (bar: number, beat?: number, stream?: string[]) => {
  console.log("bar", bar);
  console.log("streamFlag: ", frontState.streamFlag);
  console.log("quantize stream: ", frontState.quantize.stream);
  // frontState.quantize.flag = true;
  // frontState.quantize.bar = bar;
  // frontState.quantize.beat =
  //   beat !== undefined ? beat : frontState.quantize.beat;
  // frontState.quantize.stream =
  //   stream !== undefined ? stream : frontState.quantize.stream;

  frontState.quantize.interval = window.setInterval(() => {
    for (const stream of frontState.quantize.stream) {
      console.log("stream", stream);
      if (
        frontState.streamFlag[stream] &&
        frontState.streamChunk[stream] !== undefined &&
        frontState.streamChunk[stream].audio !== undefined
      ) {
        quantizePlay(frontState.streamChunk[stream], socket.id);
      }
    }
    frontState.quantize.currentTime = audioContext.currentTime;
    console.log("bar currentTime", frontState.quantize.currentTime);
  }, bar);
  // eighthNoteSec = eightNote;
  // quantizeInterval = window.setInterval(() => {
  //   console.log("quantize");
  //   quantizerCurrentTime = audioContext.currentTime;
  //   console.log(quantizerCurrentTime);
  // }, bar);
};

export const stopQuantize = () => {
  console.log("stop quantize");
  clearInterval(frontState.quantize.interval);
  frontState.quantize.flag = false;
  frontState.quantize.currentTime = 0;
  frontState.quantize.bar = 0;
  console.log("frontState.quantize", frontState.quantize);
  // quantizerCurrentTime = 0;
};

export const quantizePlay = (
  data: {
    source: string;
    audio: Float32Array;
    video?: string;
    sampleRate: number;
    glitch: boolean;
    bufferSize: number;
    duration?: number;
    floating?: boolean;
    position?: { top: number; left: number; width: number; height: number };
    target?: string;
  },
  id
) => {
  console.log("streamPlay, debug quantizePlay");
  const beat =
    frontState.quantize.beat === 0
      ? Math.pow(2, Math.floor(Math.random() * 6))
      : frontState.quantize.beat;
  for (let i = 0; i <= beat; i++) {
    setTimeout(() => {
      if (frontState.streamFlag[data.source]) {
        playAudioStream(
          data.audio,
          data.sampleRate,
          data.glitch,
          data.bufferSize
        );
        if (data.video) {
          showImage(data.video, ctx);
          setTimeout(() => {
            erasePrint(ctx, cnvs);
          }, 300);
        } else if (data.source !== undefined) {
          textPrint(data.source.toLowerCase(), ctx, cnvs);
        }
      }
    }, (frontState.quantize.bar / beat) * i);
  }
  if (data.source === "CHAT") {
    chatReq(String(id));
  } else {
    socket.emit("streamReqFromClient", data.source);
  }
  // if (frontState.recLatency) {
  //   setTimeout(() => {
  //     if (data.source === "CHAT") {
  //       chatReq(String(id));
  //     } else {
  //       socket.emit("streamReqFromClient", data.source);
  //     }
  //   }, (data.bufferSize / data.sampleRate) * 1000);
};

// streamPlay(data.source === "CHAT" ? "CHAT" : "STREAM", id, data);

// const beat =
//   frontState.quantize.beat === 0
//     ? Math.pow(2, Math.floor(Math.random() * 5))
//     : frontState.quantize.beat;
// if (beat >= 16) {
//   const note = frontState.quantize.bar / beat;
//   for (let i = 1; i <= beat / 4; i++) {
//     setTimeout(() => {
//       streamPlay(data.source === "CHAT" ? "CHAT" : "STREAM", id, data);
//     }, note * i);
//   }
// }

export const streamPlay = (
  type: "CHAT" | "STREAM",
  id: string,
  stream: {
    audio: Float32Array;
    sampleRate: number;
    glitch: boolean;
    bufferSize: number;
    duration?: number;
    video?: string;
    source?: string;
    floating?: boolean;
  },
  cinemaFlag?: boolean
) => {
  // if (!frontState.quantize.flag) {
  // console.log("chatFromServer");
  // console.log("socket.id(socket.on): " + String(socket.id));
  // console.log(stream.audio);

  playAudioStream(
    stream.audio,
    stream.sampleRate,
    stream.glitch,
    stream.bufferSize
  );
  if (stream.video) {
    showImage(stream.video, ctx);
    if (type === "STREAM" && cinemaFlag !== undefined && cinemaFlag) {
      setTimeout(() => {
        erasePrint(ctx, cnvs);
      }, 300);
    }
  } else if (stream.source !== undefined) {
    textPrint(stream.source.toLowerCase(), ctx, cnvs);
  }
  if (frontState.recLatency) {
    setTimeout(() => {
      if (type === "CHAT") {
        chatReq(String(id));
      } else {
        socket.emit("streamReqFromClient", stream.source);
      }
    }, (stream.bufferSize / stream.sampleRate) * 1000);
  } else {
    if (type === "CHAT") {
      chatReq(String(id));
    } else {
      socket.emit("streamReqFromClient", stream.source);
    }
  }
  // } else {
  //   if (frontState.quantize.timeout === 0) {
  //     frontState.quantize.timeout = getBeatTimeout(
  //       frontState.quantize.bar / frontState.quantize.beat,
  //       audioContext.currentTime,
  //       frontState.quantize.currentTime
  //     );
  //     // console.log("timeout", frontState.quantize.timeout);
  //     // const currentTime = audioContext.currentTime;
  //     // const beatTime = frontState.quantize.bar / frontState.quantize.beat;
  //     // frontState.quantize.timeout =
  //     //   beatTime > (currentTime - frontState.quantize.currentTime) * 1000
  //     //     ? beatTime - (currentTime - frontState.quantize.currentTime) * 1000
  //     //     : beatTime * 2 -
  //     //       (currentTime - frontState.quantize.currentTime) * 1000;
  //     // console.log(
  //     //   "bar",
  //     //   frontState.quantize.bar,
  //     //   "currentTime",
  //     //   currentTime,
  //     //   "frontState.currentTime",
  //     //   frontState.quantize.currentTime
  //     // );
  //     setTimeout(() => {
  //       console.log("play", frontState.quantize.timeout);
  //       playAudioStream(
  //         stream.audio,
  //         stream.sampleRate,
  //         stream.glitch,
  //         stream.bufferSize
  //       );
  //       if (stream.video) {
  //         showImage(stream.video, ctx);
  //       } else if (stream.source !== undefined) {
  //         textPrint(stream.source.toLowerCase(), ctx, cnvs);
  //       }
  //       frontState.quantize.timeout = 0;
  //     }, frontState.quantize.timeout);
  //   } else {
  //     console.log("not timeout", frontState.quantize.timeout);
  //   }
  //   console.log("request");
  //   if (type === "CHAT") {
  //     chatReq(String(id));
  //   } else {
  //     socket.emit("streamReqFromClient", stream.source);
  //   }
  // }
};

const getBeatTimeout = (
  beatTime: number,
  currentTime: number,
  quantizeCurrentTime: number
): number => {
  let diff = currentTime - quantizeCurrentTime;

  if (beatTime > diff * 1000) {
    return beatTime - diff * 1000;
  }

  let n = 2;
  while (n * beatTime <= diff * 1000) {
    n++;
  }

  return n * beatTime - diff * 1000;
};
