import { io, Socket } from 'socket.io-client';
const socket: Socket = io();
import {initVideo, initVideoStream, canvasSizing, textPrint, erasePrint, showImage} from './imageEvent'

import {initAudio, initAudioStream, sinewave, whitenoise, feedback, bass, click, chatReq, playAudioStream, stopCmd, recordReq} from './webaudio'
//import { oldGetUserMedia } from './oldGetUserMedia';

import {keyDown} from './textInput'


let start = false

const cnvs = <HTMLCanvasElement> document.getElementById('cnvs');
const ctx: CanvasRenderingContext2D = cnvs.getContext('2d');
const strCnvs = <HTMLCanvasElement> document.getElementById('strCnvs');
const stx: CanvasRenderingContext2D = strCnvs.getContext('2d');
const bckCnvs = <HTMLCanvasElement> document.getElementById('bckCnvs');
const btx: CanvasRenderingContext2D = bckCnvs.getContext('2d');
const instructionCnvs = <HTMLCanvasElement> document.getElementById('instructionCnvs');
const itx: CanvasRenderingContext2D = strCnvs.getContext('2d');

let darkFlag = false

let windowWidth = window.innerWidth
let windowHeight = window.innerHeight
let videoElement = <HTMLVideoElement>document.getElementById('video');

/*
let bufferLength
let beatGain
let prevGain = 0.7;
let oscPortament = 0;
let streamBuffer = <Array<{audio:Float32Array, video:string}>> [];
let bufferSize = 8192;
let bufferRate = 48000;
let chatBuffer = <{
  audio:Float32Array,
  target?:string,
  video?:string
}> {};

let playsampleRate = 48000

let freqVal: number;
*/
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
document.addEventListener('keydown', (e) => {
  console.log(e)
  stringsClient = keyDown(e, stringsClient, start, socket, stx, strCnvs, ctx, cnvs)
})

canvasSizing();
socket.emit('connectFromClient', 'client')
socket.on('stringsFromServer', (data: {
  strings: string,
  timeout: boolean
}) =>{
    erasePrint(stx, strCnvs);
    erasePrint(ctx, cnvs);
    console.log(data)
    stringsClient = data.strings
    textPrint(stringsClient, stx, strCnvs)
    if(data.timeout) {
      setTimeout(() => {
        erasePrint(stx, strCnvs)
      }, 500)
    }
});
socket.on('erasePrintFromServer',() =>{
  erasePrint(stx, strCnvs)
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
      erasePrint(stx, strCnvs);
      erasePrint(ctx, cnvs);
      textPrint("WHITENOISE", stx, strCnvs);
      whitenoise(cmd.flag, cmd.fade, cmd.gain)
      break;
    case 'SINEWAVE':
      erasePrint(stx, strCnvs);
      erasePrint(ctx, cnvs);
      textPrint(String(cmd.value) + 'Hz', stx, strCnvs);
      sinewave(cmd.flag, cmd.value, cmd.fade, cmd.portament, cmd.gain)
      break;
    case 'FEEDBACK':
      erasePrint(stx, strCnvs);
      erasePrint(ctx, cnvs);
      textPrint("FEEDBACK", stx, strCnvs);
      feedback(cmd.flag, cmd.fade, cmd.gain)
      break;
    case 'BASS':
      bass(cmd.flag, cmd.gain)
      erasePrint(stx, strCnvs);
      erasePrint(ctx, cnvs);
      textPrint("BASS", stx, strCnvs);
      break;
    case 'CLICK':
      click(cmd.gain)
      erasePrint(stx, strCnvs)
      erasePrint(ctx, cnvs)
      textPrint('CLICK', stx, strCnvs)
      setTimeout(()=>{
        erasePrint(stx, strCnvs);
      },300);  
        
      break;
    default:
      break;
  }
  // strings = '';
  stringsClient = '';
});

socket.on('stopFromServer', (fadeOutVal) => {
  stopCmd(fadeOutVal)
  erasePrint(ctx, cnvs)
  erasePrint(stx, strCnvs)
  textPrint('STOP', stx, strCnvs)
  setTimeout(()=> {
    erasePrint(stx, strCnvs)
  },800)
})

socket.on('textFromServer', (data: {text: string}) => {
    erasePrint(stx, strCnvs)
    textPrint(data.text, stx, strCnvs)
});

socket.on('chatReqFromServer', () => {
  chatReq()
  setTimeout(() => {
    erasePrint(stx, strCnvs)
  },1000)
})

socket.on('recordReqFromServer', (data: {target: string, timeout:number}) => {
  recordReq(data)
  textPrint('RECORD', stx, strCnvs)
  setTimeout(() => {
    erasePrint(stx, strCnvs)
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
  showImage(data.video, cnvs)
  chatReq()
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
  console.log(data.audio)
  // console.log(data.video)
  erasePrint(stx, strCnvs)
  playAudioStream(data.audio, data.sampleRate, data.glitch, data.bufferSize)
  console.log(data.video)
  if(data.video) {
    showImage(data.video, cnvs)
  } else {
    textPrint(data.source, stx, strCnvs)
  }
  console.log(data.source)
  socket.emit('streamReqFromClient', data.source)
})

// disconnect時、1秒後再接続
socket.on('disconnect', ()=>{
  console.log("disconnect")
  setTimeout(()=> {
    socket.connect()
  },1000)
})


export const initialize = async () => {
  erasePrint(stx, strCnvs)
  erasePrint(ctx, cnvs)

  await initVideo(videoElement)
  await initAudio()

  const SUPPORTS_MEDIA_DEVICES = 'mediaDevices' in navigator
  if (SUPPORTS_MEDIA_DEVICES && navigator.mediaDevices.getUserMedia) {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const cameras = devices.filter((device) => device.kind === 'videoinput');
    if (cameras.length === 0) {
      throw 'No camera found on this device.'
    }
//    const camera = cameras[cameras.length - 1]
    const camera = cameras[0];
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
    await textPrint('initialized', stx, strCnvs)
    await setTimeout(() => {
      erasePrint(stx, strCnvs)
    }, 500);
  } else {
    textPrint('not support navigator.mediaDevices.getUserMedia', stx, strCnvs)
//    oldGetUserMedia()
/*
    let oldNavigator: any
    oldNavigator = navigator

    const stream = await oldNavigator.getUserMedia({
      video: true,audio : true
    })
    await textPrint('try init')
    await initAudioStream(stream)
    await initVideoStream(stream)
    await textPrint('initialized')
    await setTimeout(() => {
      erasePrint('strings')
    }, 500);
    */
  }
  
  start = true
}
textPrint('click screen', stx, strCnvs)
