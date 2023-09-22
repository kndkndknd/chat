import { io, Socket } from 'socket.io-client';
const socket: Socket = io();
import {initVideo, initVideoStream, canvasSizing, textPrint, erasePrint, showImage, } from './imageEvent'

import {
  initAudio, 
  initAudioStream, 
  sinewave, 
  whitenoise, 
  feedback, 
  bass, 
  click, 
  chatReq, 
  playAudioStream, 
  stopCmd, 
  recordReq, 
  streamFlag, 
  simulate, 
  metronome, 
  gainChange, 
  quantize,
  stopQuantize
} from './webaudio'

import {cnvs, ctx, videoElement,} from './globalVariable'

//import {debugOn} from './socket'

import {keyDown} from './textInput'

import {newWindowReqType} from './types/global'
import { enableClockMode, disableClockMode } from './clockMode';

let start = false

let darkFlag = false
let cinemaFlag = false
let clockModeId: number = 0;

// let videoElement = <HTMLVideoElement>document.getElementById('video');
let timelapseId: NodeJS.Timer

let stringsClient = '';

let eListener = <HTMLElement> document.getElementById('wrapper')
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

socket.on('stringsFromServer', (data: {
  strings: string,
  timeout: boolean
}) =>{
    // erasePrint(stx, strCnvs);
    erasePrint(ctx, cnvs);
    console.log(data)
    stringsClient = data.strings
    textPrint(stringsClient, ctx, cnvs)
    if(data.timeout) {
      setTimeout(() => {
        erasePrint(ctx, cnvs)
      }, 500)
    }
    if(cinemaFlag) {
      setTimeout(() => {
        erasePrint(ctx, cnvs)
      },500)
    }
});
socket.on('erasePrintFromServer',() =>{
  // erasePrint(stx, strCnvs)
  erasePrint(ctx, cnvs)
});

socket.on('cmdFromServer', (cmd: {
  cmd: string, 
  property: string, 
  value: number, 
  flag: boolean, 
  target?: string, 
  overlay?: boolean, 
  fade?: number, 
  portament?: number, 
  gain?: number  
}) => {
  switch(cmd.cmd){
    case 'WHITENOISE':
      // erasePrint(stx, strCnvs);
      erasePrint(ctx, cnvs);
      textPrint("WHITENOISE", ctx, cnvs);
      // if(cmd.fade && cmd.gain) 
        whitenoise(cmd.flag, cmd.fade, cmd.gain)
        if(cinemaFlag) {
          setTimeout(() => {
            erasePrint(ctx, cnvs)
          },500)
        }
          break;
    case 'SINEWAVE':
      // erasePrint(stx, strCnvs);
      erasePrint(ctx, cnvs);
      textPrint(String(cmd.value) + 'Hz', ctx, cnvs);
      console.log('debug2')
      // if(cmd.fade && cmd.portament && cmd.gain) {
        console.log('debug3')
        sinewave(cmd.flag, cmd.value, cmd.fade, cmd.portament, cmd.gain)
        if(cinemaFlag) {
          setTimeout(() => {
            erasePrint(ctx, cnvs)
          },500)
        }
          break;
    case 'FEEDBACK':
      // erasePrint(stx, strCnvs);
      erasePrint(ctx, cnvs);
      textPrint("FEEDBACK", ctx, cnvs);
      // if(cmd.fade && cmd.gain) 
        feedback(cmd.flag, cmd.fade, cmd.gain)
        if(cinemaFlag) {
          setTimeout(() => {
            erasePrint(ctx, cnvs)
          },500)
        }
          break;
    case 'BASS':
      // if(cmd.gain) 
        bass(cmd.flag, cmd.gain)
      // erasePrint(stx, strCnvs);
      erasePrint(ctx, cnvs);
      textPrint("BASS", ctx, cnvs);
      if(cinemaFlag) {
        setTimeout(() => {
          erasePrint(ctx, cnvs)
        },500)
      }
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

socket.on('textFromServer', (data: {text: string}) => {
    erasePrint(ctx, cnvs)
    textPrint(data.text, ctx, cnvs)
    if(cinemaFlag) {
      setTimeout(() => {
        erasePrint(ctx, cnvs)
      },500)
    }
});

socket.on('chatReqFromServer', () => {
  chatReq()
  setTimeout(() => {
    erasePrint(ctx, cnvs)
  },1000)
})

socket.on('recordReqFromServer', (data: {target: string, timeout:number}) => {
  recordReq(data)
  textPrint('RECORD', ctx, cnvs)
  setTimeout(() => {
    erasePrint(ctx, cnvs)
  }, data.timeout)
})

// CHATのみ向けにする
socket.on('chatFromServer', (data: {
  audio: Float32Array, 
  video?: string, 
  sampleRate: number, 
  source?: string, 
  glitch: boolean,
  bufferSize: number,
  duration: number
}) => {
  console.log(data.audio)
  playAudioStream(data.audio, data.sampleRate, data.glitch, data.bufferSize)
  if(data.video) {
    showImage(data.video, ctx)
  }
  setTimeout(()=>{
    chatReq()
  },data.bufferSize / data.sampleRate * 1000)
});

// CHAT以外のSTREAM向け
socket.on('streamFromServer', (data: {
  source: string, 
  audio: Float32Array, 
  video?: string, 
  sampleRate: number, 
  glitch: boolean,
  bufferSize: number,
  duration?: number 
}) => {
  // console.log(data.audio)
  console.log(data.video)
  // erasePrint(ctx, cnvs)
  if(data.audio){
    playAudioStream(data.audio, data.sampleRate, data.glitch, data.bufferSize)
  }
  // console.log(data.video)
  if(data.video) {
    showImage(data.video, ctx)
    if(cinemaFlag) {
      setTimeout(() => {
        erasePrint(ctx, cnvs)
      },300)
    }
  } else {
    textPrint(data.source.toLowerCase(), ctx, cnvs)
  }
  console.log(data.source)
  setTimeout(()=>{
    socket.emit('streamReqFromClient', data.source)
  },data.bufferSize / data.sampleRate * 1000)
})

socket.on('voiceFromServer', (data: {text: string, lang: string}) => {
  console.log('debug')
  const uttr = new SpeechSynthesisUtterance();
  uttr.lang = data.lang
  uttr.text = data.text
  // 英語に対応しているvoiceを設定
  speechSynthesis.onvoiceschanged = () => {
    const voices = speechSynthesis.getVoices()
    for (let i = 0; i < voices.length; i++)  {
      console.log(voices[i])
      if (voices[i].lang === 'en-US') {
        console.log('hit')
        console.log(voices[i])
        uttr.voice = voices[i]
      }
    }

  }
  /*
  speechSynthesis.onvoiceschanged = getVoices
  var voices
  function getVoices () {
    voices = speechSynthesis.getVoices()
  }
  console.log(voices)
  for (let i = 0; i < voices.length; i++)  {
    console.log(voices[i])
    if (voices[i].lang === 'en-US') {
      uttr.voice = voices[i]
    }
  }
  */

/*
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
*/
    speechSynthesis.speak(uttr);
  
})

socket.on('gainFromServer', (data) => {
  gainChange(data)
})

socket.on('windowReqFromServer', (data: newWindowReqType) => {
  window.open(data.URL, '_blank', 'width=' + String(data.width) + ',height=' + String(data.height) + ',top=' + String(data.top) + ',left=' + String(data.left))
  click(1.0)
})

socket.on('quantizeFromServer', (data: {flag: boolean, bpm: number, bar: number, eightNote: number}) => {
  if(data.flag) {
    quantize(data.bar, data.eightNote)
    textPrint('QUANTIZE(BPM:' + String(data.bpm) + ')' , ctx, cnvs)
    setTimeout(() => {
      erasePrint(ctx, cnvs)
    }, 800)
  } else {
    stopQuantize()
    textPrint('QUANTIZE:false' , ctx, cnvs)
    setTimeout(() => {
      erasePrint(ctx, cnvs)
    }, 800)
  }
})

socket.on('clockModeFromServer', (data: {clockMode: boolean}) => {
  console.log(data)
  if(data.clockMode) {
    if(clockModeId === 0) {
      clockModeId = enableClockMode();
    }  
  } else {
    if(clockModeId !== 0) {
      clockModeId = disableClockMode(clockModeId);
    }
  }
})

// disconnect時、1秒後再接続
socket.on('disconnect', ()=>{
  console.log("disconnect")
  setTimeout(()=> {
    socket.connect()
  },1000)
})

export const initialize = async () => {
  erasePrint(ctx, cnvs)

  await initVideo(videoElement)
  await initAudio()

  const SUPPORTS_MEDIA_DEVICES = 'mediaDevices' in navigator
  if (SUPPORTS_MEDIA_DEVICES && navigator.mediaDevices.getUserMedia) {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const cameras = devices.filter((device) => device.kind === 'videoinput');
    const mics = devices.filter((device) => device.kind === 'audioinput');
    if (cameras.length === 0) {
      throw 'No camera found on this device.'
    }
//    const camera = cameras[cameras.length - 1]
    const camera = cameras[0];
    /*
    const mic = mics.filter((element)=>{
      if(element.label.includes("Microphone Array")){
        console.log(element.label)
        return element
      }
    })[0]
    console.log(mics)
    console.log(mic)
    */
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        //facingMode: 'environment'
        deviceId: camera.deviceId,
        facingMode: ['user', 'environment'],
        height: {ideal: 1080},
        width: {ideal: 1920}
      },audio : {
        sampleRate: {ideal: 44100},
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    })
    await initAudioStream(stream)
    await initVideoStream(stream, videoElement)
    await console.log(stream)
    await textPrint('initialized', ctx, cnvs)
    await socket.emit('connectFromClient', 'client')
    await setTimeout(() => {
      erasePrint(ctx, cnvs)
    }, 500);
  } else {
    textPrint('not support navigator.mediaDevices.getUserMedia', ctx, cnvs)
  }
  
  start = true
  streamFlag.timelapse = true
  timelapseId = setInterval(() => {
    streamFlag.timelapse = true
  }, 60000)

  /*
  quantize(100)

setTimeout(() => {
  stopQuantize()
},5000)

  */
}
textPrint('click screen', ctx, cnvs)


//debugOn