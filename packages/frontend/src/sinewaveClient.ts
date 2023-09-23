import { io, Socket } from 'socket.io-client';
const socket: Socket = io();
import {canvasSizing, textPrint, erasePrint, showImage, } from './imageEvent'

import {
  initAudio, 
  sinewave, 
  click, 
  stopCmd, 
  metronome, 
  gainChange, 
} from './webaudio'

import {cnvs, ctx} from './globalVariable'

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

socket.on('gainFromServer', (data) => {
  gainChange(data)
})

socket.on('windowReqFromServer', (data: newWindowReqType) => {
  window.open(data.URL, '_blank', 'width=' + String(data.width) + ',height=' + String(data.height) + ',top=' + String(data.top) + ',left=' + String(data.left))
  click(1.0)
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

  // await initVideo(videoElement)
  await initAudio()

  await textPrint('initialized (sinewave only)', ctx, cnvs)
  await socket.emit('connectFromClient', 'sinewaveClient')
  await setTimeout(() => {
    erasePrint(ctx, cnvs)
  }, 500);

}
textPrint('click screen', ctx, cnvs)


