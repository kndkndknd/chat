import { io, Socket } from 'socket.io-client';
const socket = io();
import {canvasSizing, textPrint, erasePrint, showImage} from './imageEvent'

//import {initAudio, initAudioStream, sinewave, whitenoise, feedback, bass, click, chatReq, playAudioStream, stopCmd, recordReq, streamFlag, simulate} from './webaudio'

import {keyDown} from './textInput'

import {cnvs, ctx, videoElement,} from './globalVariable'

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;

let chatGainVal = 1.5
let glitchGainVal = 1.5

let audioContext
let masterGain
let javascriptnode
let osc
let oscGain
let feedbackGain
let whitenoiseOsc
let whitenoiseNode
let noiseGain
let buf0
let buf1
let bassOsc
let bassGain
let clickOsc
let clickGain

let chatGain

let convolver
let glitchGain

let simulateOsc
let simulateGain
let simFilter
let analyser

let streamFlag = {
  chat: false,
  record: false,
  timelapse: false,
  simulate: false
}
let video_track

let simsGain = 1


let start = false

let windowWidth = window.innerWidth
let windowHeight = window.innerHeight
let timelapseId

let stringsClient = '';

let cnvsElement
let bufferContext

let eListener = document.getElementById('wrapper')
eListener.addEventListener('click', (()=>{
  if(!start) {
   initialize()
  }
}), false);

window.addEventListener('resize', (e) =>{
  console.log('resizing')
  canvasSizing()
})
canvasSizing();

document.addEventListener('keydown', (e) => {
  console.log(e)
  stringsClient = keyDown(e, stringsClient, socket, ctx, cnvs, ctx, cnvs)
})


socket.on('stringsFromServer', (data) =>{
  // erasePrint(stx, strCnvs);
  erasePrint(ctx, cnvs);
  console.log('strings debug')
  console.log(data)
  stringsClient = data.strings
  textPrint(stringsClient, ctx, cnvs)
  if(data.timeout) {
    setTimeout(() => {
      erasePrint(ctx, cnvs)
    }, 500)
  }
});
socket.on('erasePrintFromServer',() =>{
// erasePrint(stx, strCnvs)
erasePrint(ctx, cnvs)
});

socket.on('cmdFromServer', (cmd) => {
switch(cmd.cmd){
  case 'WHITENOISE':
    // erasePrint(stx, strCnvs);
    erasePrint(ctx, cnvs);
    textPrint("WHITENOISE", ctx, cnvs);
    // if(cmd.fade && cmd.gain) 
      whitenoise(cmd.flag, cmd.fade, cmd.gain)
        break;
  case 'SINEWAVE':
    // erasePrint(stx, strCnvs);
    erasePrint(ctx, cnvs);
    textPrint(String(cmd.value) + 'Hz', ctx, cnvs);
    console.log(cmd)
    // if(cmd.fade && cmd.portament && cmd.gain) {
      console.log('debug3')
      sinewave(cmd.flag, cmd.value, cmd.fade, cmd.portament, cmd.gain)
        break;
  case 'FEEDBACK':
    // erasePrint(stx, strCnvs);
    erasePrint(ctx, cnvs);
    textPrint("FEEDBACK", ctx, cnvs);
    // if(cmd.fade && cmd.gain) 
      feedback(cmd.flag, cmd.fade, cmd.gain)
        break;
  case 'BASS':
    // if(cmd.gain) 
      bass(cmd.flag, cmd.gain)
    // erasePrint(stx, strCnvs);
    erasePrint(ctx, cnvs);
    textPrint("BASS", ctx, cnvs);
      break;
  case 'CLICK':
    // if(cmd.gain)
      click(cmd.gain)
    // erasePrint(stx, strCnvs)
    erasePrint(ctx, cnvs)
    textPrint('CLICK', ctx, cnvs)
    setTimeout(()=>{
      erasePrint(ctx, cnvs);
    },300)
    break
  case 'SIMULATE':
    simulate(cmd.gain)
      break
      case 'METRONOME':
        console.log('METRONOME')
        metronome(cmd.flag, cmd.value, cmd.gain)
        break
    default:
    break;
}
// strings = '';
stringsClient = '';
});

socket.on('stopFromServer', (fadeOutVal) => {
stopCmd(fadeOutVal)
erasePrint(ctx, cnvs)
// erasePrint(stx, strCnvs)
textPrint('STOP', ctx, cnvs)
setTimeout(()=> {
  erasePrint(ctx, cnvs)
},800)
})

socket.on('textFromServer', (data) => {
  console.log(data)
  erasePrint(ctx, cnvs)
  textPrint(data.text, ctx, cnvs)
});

socket.on('chatReqFromServer', () => {
chatReq()
setTimeout(() => {
  erasePrint(ctx, cnvs)
},1000)
})

socket.on('recordReqFromServer', (data) => {
recordReq(data)
textPrint('RECORD', ctx, cnvs)
setTimeout(() => {
  erasePrint(ctx, cnvs)
}, data.timeout)
})

// CHATのみ向けにする
socket.on('chatFromServer', (data) => {
console.log(data.audio)
playAudioStream(data.audio, data.sampleRate, data.glitch, data.bufferSize)
if(data.video) {
  showImage(data.video, ctx)
}
chatReq()
});

// CHAT以外のSTREAM向け
socket.on('streamFromServer', (data) => {
// console.log(data.audio)
console.log(data.video)
// erasePrint(ctx, cnvs)
if(data.audio){
  playAudioStream(data.audio, data.sampleRate, data.glitch, data.bufferSize)
}
// console.log(data.video)
if(data.video) {
  showImage(data.video, ctx)
} else {
  textPrint(data.source.toLowerCase(), ctx, cnvs)
}
console.log(data.source)
socket.emit('streamReqFromClient', data.source)
})

socket.on('voiceFromServer', (data) => {
const uttr = new SpeechSynthesisUtterance();
//  uttr.lang = 'en-US';
uttr.text = data
// 英語に対応しているvoiceを設定
speechSynthesis.onvoiceschanged = function(){
  const voices = speechSynthesis.getVoices()
  for (let i = 0; i < voices.length; i++)  {
    console.log(voices[i])
    if (voices[i].name === 'Google US English') {
      console.log(voices)
      uttr.voice = voices[i]
    }
  }

};
  speechSynthesis.speak(uttr);

})

// disconnect時、1秒後再接続
socket.on('disconnect', ()=>{
  console.log("disconnect")
  setTimeout(()=> {
    socket.connect()
  },1000)
})

const initialize = async () =>{
  erasePrint(ctx, cnvs)

  // initVideo
  videoElement.play()
  videoElement.volume = 0

  console.log("start")
  //audioContext
  audioContext = new AudioContext();

  masterGain = audioContext.createGain();
  masterGain.gain.setValueAtTime(1,0)
  masterGain.connect(audioContext.destination);
//  console.log(masterGain.gain.maxValue)

  //record/play
  // javascriptnode = audioContext.createScriptProcessor(8192, 1, 1);
  // sinewave
  osc = audioContext.createOscillator();
  oscGain = audioContext.createGain();
  osc.connect(oscGain);
  osc.frequency.setValueAtTime(440, 0);
//  oscGain.gain.setTargetAtTime(0, 0, 0)
  oscGain.gain.setValueAtTime(0,0);
  console.log(oscGain.gain)
  oscGain.connect(masterGain)
  osc.start(0);

  //whitenoise 
  whitenoiseOsc = audioContext.createOscillator();
  whitenoiseNode = audioContext.createScriptProcessor(1024)
  noiseGain = audioContext.createGain()
  noiseGain.gain.setValueAtTime(0,0)
  whitenoiseNode.onaudioprocess = (ev) => {
    buf0 = ev.outputBuffer.getChannelData(0)
    buf1 = ev.outputBuffer.getChannelData(1)
    for(let i=0;i<1024;++i) {
      buf0[i] = buf1[i] = (Math.random()-0.5)
    }
  }
  whitenoiseOsc.connect(whitenoiseNode)
  whitenoiseNode.connect(noiseGain)
  noiseGain.connect(masterGain)
  whitenoiseOsc.start(0)
  // feedback
  feedbackGain = audioContext.createGain();
  feedbackGain.gain.setValueAtTime(0,0);

  //bass
  bassOsc = audioContext.createOscillator()
  bassGain = audioContext.createGain()
  bassOsc.connect(bassGain)
  bassOsc.frequency.setValueAtTime(88, 0)
  bassGain.gain.setValueAtTime(0,0)
  bassGain.connect(masterGain)
  bassOsc.start(0)

  //click
  clickOsc = audioContext.createOscillator()
  clickGain = audioContext.createGain()
  clickOsc.connect(clickGain)
  clickOsc.frequency.setValueAtTime(440, 0)
  clickGain.gain.setValueAtTime(0,0)
  clickGain.connect(masterGain)
  clickOsc.start(0)

  // chat / feedback
  javascriptnode = audioContext.createScriptProcessor(8192, 1, 1)
  convolver = audioContext.createConvolver();
  glitchGain = audioContext.createGain();
  glitchGain.gain.setValueAtTime(glitchGainVal,0);
  convolver.connect(glitchGain);
  glitchGain.connect(audioContext.destination)
  chatGain = audioContext.createGain()
  chatGain.gain.setValueAtTime(chatGainVal,0)
  chatGain.connect(masterGain)
  // SIMULATE
  simulateOsc = audioContext.createOscillator();
  simulateGain = audioContext.createGain();
  simulateOsc.connect(simulateGain);
  simulateOsc.frequency.setValueAtTime(440, 0);
  simulateGain.gain.setValueAtTime(0,0);
  simulateGain.connect(masterGain)
  simulateOsc.start(0);
  simFilter = audioContext.createBiquadFilter();
  simFilter.type = "lowpass";
  simFilter.frequency.setValueAtTime(1000,0);

  await navigator.getUserMedia({
    video: true, audio: {
      "mandatory": {
        "googEchoCancellation": false,
        "googAutoGainControl": false,
        "googNoiseSuppression": false,
        "googHighpassFilter": false,
        "echoCancellation" : false, 
        "googEchoCancellation": false
      },"optional": []
    } 
  }, (stream) =>{
    console.log(stream)
    console.log('debug2')
    let mediastreamsource
    mediastreamsource = audioContext.createMediaStreamSource(stream)
    mediastreamsource.connect(javascriptnode)
    mediastreamsource.connect(feedbackGain)
    feedbackGain.connect(masterGain)
    javascriptnode.onaudioprocess = onAudioProcess
    javascriptnode.connect(masterGain)
    //rec

    //SIMULATE
    analyser = audioContext.createAnalyser();
    mediastreamsource.connect(simFilter);
    simFilter.connect(analyser);

    //videoInit
    video_track = stream.getVideoTracks()[0];
    videoElement.src = window.URL.createObjectURL(stream);
    videoElement.volume = 0;

    videoElement.srcObject = stream
    cnvsElement = document.createElement('canvas')
    bufferContext = cnvsElement.getContext('2d');
    let render = () => {
      requestAnimationFrame(render);
      const width = videoElement.videoWidth;
      const height = videoElement.videoHeight;
      console.log(width)
      if(width == 0 || height ==0) {return;}
      cnvsElement.width = width;
      cnvsElement.height = height;
      if(bufferContext) {
        bufferContext.drawImage(videoElement, 0, 0);
      }
    }
    render();
  

  },  (e) =>{
    return console.log(e);
  });

  await textPrint('initialized', ctx, cnvs)
  await socket.emit('connectFromClient', 'client')
  await setTimeout(() => {
    erasePrint(ctx, cnvs)
  }, 500);
  start = true
  timelapseId = setInterval(() => {
    streamFlag.timelapse = true
  }, 60000)
};

textPrint('click screen', ctx, cnvs)



const playAudioStream = (bufferArray, sampleRate, glitch, bufferSize) => {
  console.log(sampleRate)
  console.log(bufferSize)
  console.log(bufferArray)
  let audio_src = audioContext.createBufferSource();
  const flo32arr = new Float32Array(bufferArray)
  let audioData = new Float32Array(bufferSize);
  for(let i = 0; i < bufferSize; i++){
    if(flo32arr[i]) {
      audioData[i] = flo32arr[i];
      // audioData[i] = 1.0
    } else {
      audioData[i] = 0.0
    }
  }
  // console.log(audioData)
  if(!glitch){
    let audio_buf = audioContext.createBuffer(1, bufferSize, sampleRate)
    audio_buf.copyToChannel(audioData, 0);
    audio_src.buffer = audio_buf;
    audio_src.connect(chatGain);
  } else {
    console.log('glitched')
    let audio_buf = audioContext.createBuffer(1, bufferSize, convolver.context.sampleRate)
    audio_buf.copyToChannel(audioData, 0);

    audio_src.buffer = audio_buf;
    convolver.buffer = audio_buf;
    audio_src.connect(convolver);
  }
  audio_src.start(0);
}

let sinwaveFlag = false

const sinewave = (flag, frequency, fade, portament, vol) => {
  console.log('debug3')
  const currentTime = audioContext.currentTime
  console.log(vol)
  console.log(frequency)
  osc.frequency.setTargetAtTime(frequency, 0, portament);
  if(flag){
    console.log('debug4')
    oscGain.gain.setTargetAtTime(vol,0,fade);
    sinwaveFlag = true
  } else {
    sinewaveFlag = false
    oscGain.gain.setTargetAtTime(0,0,fade);
  }
//  console.log(oscGain.gain)
}

const whitenoise = (flag, fade, gain) => {
  const currentTime = audioContext.currentTime
  if(flag) {
    noiseGain.gain.setTargetAtTime(gain,0,fade);
  } else {
    noiseGain.gain.setTargetAtTime(0,0,fade);
  }
}

const feedback = (flag, fade, gain) => {
  const currentTime = audioContext.currentTime
  if(flag) {
    feedbackGain.gain.setTargetAtTime(gain,0,fade);
  } else {
    feedbackGain.gain.setTargetAtTime(0,0,fade);
  }
}

const bass = (flag, gain) => {
  if(flag) {
    bassGain.gain.setValueAtTime(gain,0)
  } else {
    bassGain.gain.setValueAtTime(0,0)
  }
}

const click = (gain, frequency) => {
  const currentTime = audioContext.currentTime
  if(frequency){
    clickOsc.frequency.setValueAtTime(frequency,0)
  } else {
    clickOsc.frequency.setValueAtTime(440,0)
  }
  clickGain.gain.setValueAtTime(gain, 0);
  clickGain.gain.setTargetAtTime(0,0,0.03);
}

const chatReq = () => {
  streamFlag.chat= true
}

const onAudioProcess = (e) => {
  const bufferSize = 8192
  if(streamFlag.chat) {
    let bufferData = {target: 'CHAT', video:toBase64(), audio: new Float32Array(bufferSize), bufferSize: bufferSize, duration: e.inputBuffer.duration}
    e.inputBuffer.copyFromChannel(bufferData.audio, 0);
    console.log(bufferData.video)
    socket.emit('chatFromClient', bufferData)
    streamFlag.chat = false
  }
  if(streamFlag.record) {
    let bufferData = {target: 'PLAYBACK', video:toBase64(), audio: new Float32Array(bufferSize), bufferSize: bufferSize, duration: e.inputBuffer.duration}
    e.inputBuffer.copyFromChannel(bufferData.audio, 0);
    console.log(bufferData)
    socket.emit('chatFromClient', bufferData)
  }
  if(streamFlag.timelapse) {
    let bufferData = {target: 'TIMELAPSE', video:toBase64(), audio: new Float32Array(bufferSize), bufferSize: bufferSize, duration: e.inputBuffer.duration}
    e.inputBuffer.copyFromChannel(bufferData.audio, 0);
    // console.log(bufferData.audio)
    socket.emit('chatFromClient', bufferData)
    streamFlag.timelapse = false
  }
  if(streamFlag.simulate){
    let freqData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(freqData);
    console.log(freqData.length)
    let freq = {freq:0,val:0}
    for (let i = 0, len = freqData.length; i < len; i++) {
      //if(freq.val < freqData[i]) freq = {freq:(i*20000/2048), val:freqData[i]/256}
      if(freq.val < freqData[i]) freq = {freq:(i*22050/analyser.fftSize), val:freqData[i]/256}
    }
    //let currentTime = audioContext.currentTime
    if(freq.val > simsGain) freq.val = simsGain
//    freq.val = simsGain
//    freq.val //later
//    if(freq.val > clientState.gain.manekkoGain) freq.val = clientState.gain.manekkoGain
    console.log(freq)
    let currentTime = audioContext.currentTime;
    simulateGain.gain.setTargetAtTime(freq.val,0,0.1)
    simulateOsc.frequency.setTargetAtTime(freq.freq,0,0.1)
    erasePrint(ctx, cnvs);
    textPrint(String(freq.freq) + "Hz", ctx, cnvs);
  }

}


const recordReq = (recordReq) => {
  switch(recordReq.target) {
    case 'PLAYBACK':
      streamFlag.record = true
      setTimeout(() => {
        streamFlag.record = false
      }, recordReq.timeout)
      break;
  }
}

//video record/play ここまで

const stopCmd = (fade) => {
  const currentTime = audioContext.currentTime
  bassGain.gain.setValueAtTime(0,0)
  feedbackGain.gain.setTargetAtTime(0,0,fade) 
  noiseGain.gain.setTargetAtTime(0,0,fade)
  oscGain.gain.setTargetAtTime(0,0,fade)

  simulateGain.gain.setTargetAtTime(0,0,fade)
  streamFlag.simulate = false
/*
  if (metronomeIntervId) {
    clearInterval(metronomeIntervId)
  }
*/

}


const simulate = (gain) => {
  streamFlag.simulate = !streamFlag.simulate
  if(streamFlag.simulate) {
    simsGain = gain
  } else {
    simsGain = 0
    simulateGain.gain.setValueAtTime(0,0);
  }

}


function toBase64(){
  cnvsElement.width = videoElement.videoWidth;
  cnvsElement.height = videoElement.videoHeight;
  if(bufferContext) {
    console.log('buffer context')
    bufferContext.drawImage(videoElement, 0, 0);
  }
  const returnURL = cnvsElement.toDataURL("image/jpeg")
  console.log(returnURL)
  return returnURL
}


const metronome = (flag, latency, gain) => {
  if (!metronomeIntervId) {
    console.log('metronome init')
    textPrint('METRONOME', ctx, cnvs)
    metronomeIntervId = setInterval(()=>{
      console.log('metronome')
      console.log(gain)
      click(gain)
      textPrint('CLICK', ctx, cnvs)
      setTimeout(()=>{
        erasePrint(ctx, cnvs)
      }, 500)
    }, latency);
  } else if(flag) {
    textPrint('METRONOME', ctx, cnvs)
    console.log('metronome change')
    clearInterval(metronomeIntervId)
    metronomeIntervId = setInterval(()=>{
      click(gain)
      textPrint('CLICK', ctx, cnvs)
      setTimeout(()=>{
        erasePrint(ctx, cnvs)
      }, 500)
    }, latency);
  } else {
    console.log('metronome stop')
    clearInterval(metronomeIntervId)
  }
}