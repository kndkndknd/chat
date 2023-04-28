import '../../assets/css/style.css'

import { io, Socket } from 'socket.io-client';
const socket: Socket = io('https://localhost:8888/', {
  withCredentials: true
});

import {cnvs, ctx, videoElement,} from '../../components/globalVariable'

/*
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;
*/

interface NavigatorWithDeprecatedGetUserMedia extends Navigator {
  getUserMedia: (
    constraints: MediaStreamConstraints,
    successCallback: (stream: MediaStream) => void,
    errorCallback: (error: Error) => void
  ) => void;
}
const navigatorWithDeprecatedGetUserMedia = navigator as NavigatorWithDeprecatedGetUserMedia;



let chatGainVal = 1.5
let glitchGainVal = 1.5

let audioContext: AudioContext
let masterGain: GainNode
let javascriptnode: ScriptProcessorNode
let osc: OscillatorNode
let oscGain: GainNode
let feedbackGain: GainNode
let whitenoiseOsc: OscillatorNode
let whitenoiseNode: ScriptProcessorNode
let noiseGain: GainNode
let buf0: Float32Array
let buf1: Float32Array
let bassOsc: OscillatorNode
let bassGain: GainNode
let clickOsc: OscillatorNode
let clickGain: GainNode

let chatGain: GainNode

let convolver: ConvolverNode
let glitchGain: GainNode

let simulateOsc: OscillatorNode
let simulateGain: GainNode
let simFilter: BiquadFilterNode
let analyser: AnalyserNode

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


const initialize = async () =>{
  // erasePrint(ctx, cnvs)

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

  await navigatorWithDeprecatedGetUserMedia.getUserMedia({
    video: true, audio: true 
  }, (stream) =>{
    console.log(stream)
    console.log('debug2')
    let mediastreamsource
    mediastreamsource = audioContext.createMediaStreamSource(stream)
    mediastreamsource.connect(javascriptnode)
    mediastreamsource.connect(feedbackGain)
    feedbackGain.connect(masterGain)
    // javascriptnode.onaudioprocess = onAudioProcess
    javascriptnode.connect(masterGain)
    //rec

    //SIMULATE
    analyser = audioContext.createAnalyser();
    mediastreamsource.connect(simFilter);
    simFilter.connect(analyser);

    //videoInit
    /*
    video_track = stream.getVideoTracks()[0];
    videoElement.src = window.URL.createObjectURL(stream);
    videoElement.volume = 0;

    videoElement.srcObject = stream
    */
    /*
    cnvsElement = document.createElement('canvas')
    bufferContext = cnvsElement.getContext('2d');
    let render = () => {
      requestAnimationFrame(render);
      const width = videoElement.videoWidth;
      const height = videoElement.videoHeight;
      if(width == 0 || height ==0) {return;}
      cnvsElement.width = width;
      cnvsElement.height = height;
      if(bufferContext) {
        bufferContext.drawImage(videoElement, 0, 0);
      }
    }
    render();
    */

  },  (e) =>{
    return console.log(e);
  });

  // await textPrint('initialized', ctx, cnvs)
  await socket.emit('connectFromClient', 'client')
  await setTimeout(() => {
    // erasePrint(ctx, cnvs)
  }, 500);
  start = true
  timelapseId = setInterval(() => {
    streamFlag.timelapse = true
  }, 60000)
};


let eListener = <HTMLElement> document.getElementById('wrapper')
eListener.addEventListener('click', (()=>{
  if(!start) {
   initialize()
  }
}), false);

