import { io, Socket } from 'socket.io-client';
const socket: Socket = io();
import {initVideo, initVideoStream, canvasSizing, textPrint, erasePrint, showImage} from './imageEvent'

import {initAudio, initAudioStream, sinewave, whitenoise, feedback, bass, click, chatReq, playAudioStream, stopCmd, recordReq, streamFlag} from './webaudio'

import {keyDown} from './textInput'


let start = false

const cnvs = <HTMLCanvasElement> document.getElementById('cnvs');
const ctx = <CanvasRenderingContext2D>cnvs.getContext('2d');

let darkFlag = false

let windowWidth = window.innerWidth
let windowHeight = window.innerHeight
let videoElement = <HTMLVideoElement>document.getElementById('video');
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


let nIntervId
let readyFlag = false


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
});
socket.on('erasePrintFromServer',() =>{
  // erasePrint(stx, strCnvs)
  erasePrint(ctx, cnvs)
});

socket.on('textFromServer', (data: {text: string}) => {
    erasePrint(ctx, cnvs)
    textPrint(data.text, ctx, cnvs)
});



export const initialize = async () => {

  if (!nIntervId) {
    nIntervId = setInterval(()=> {readyFlag = true}, 300);
  }
  
  const handleOrientationEvent = (orientationObject) => {
    textPrint(String(orientationObject.alpha), ctx, cnvs)
    socket.emit('orientationFromClient', orientationObject)
  }

  if(typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
    (DeviceOrientationEvent as any).requestPermission().then( function( response ){
      if( response === 'granted' ){
        window.addEventListener('deviceorientation', function(event) {
          if(readyFlag && event.alpha && event.beta && event.gamma) {
            const alpha = event.alpha-90
            const beta = event.beta < 180 ? -event.beta : -(event.beta - 360)
            const gamma = event.gamma < 180 ? event.gamma : (event.gamma - 360)
            console.log(event)    
            const orientation = {alpha: alpha, gamma: gamma, beta: beta}
        
            handleOrientationEvent(orientation);
            readyFlag = false
          }
        }, true)
      }
    }).catch( function( e ){
      console.log( e );
    });  
  } else {
    window.addEventListener('deviceorientation', function(event) {
      if(readyFlag && event.alpha && event.beta && event.gamma) {
        const alpha = event.alpha-90
        const beta = event.beta < 180 ? -event.beta : -(event.beta - 360)
        const gamma = event.gamma < 180 ? event.gamma : (event.gamma - 360)
        console.log(event)    
        const orientation = {alpha: alpha, gamma: gamma, beta: beta}
    
        handleOrientationEvent(orientation);
        readyFlag = false
      }
    }, true)
  
  }

  erasePrint(ctx, cnvs)

}
textPrint('click screen', ctx, cnvs)
