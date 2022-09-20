import { io, Socket } from 'socket.io-client';
const socket: Socket = io();
import {initAudio, initAudioStream, sinewave, whitenoise, feedback, bass, click, chatReq, playAudioStream, stopCmd, recordReq, streamFlag} from './webaudio'
import {keyDown} from './textInput'
import {textPrint, erasePrint, showImage, initVideoStream, initVideo, canvasSizing} from './imageEvent'
import { initThree, stringsToThree, removeMesh, canvasMaterialUpdate, onWindowResize, threeKeyDown, threeErasePrint, threeTextPrint, reloadVideo, addRoom, orientationToThree, fadeAway } from './threes';

let printStrings = "";
let inputStrings = "";

const canvas2d = <HTMLCanvasElement> document.getElementById('cnvs')
const ctx2d = <CanvasRenderingContext2D> canvas2d.getContext('2d') 

// CHAT部分
let start = false
let videoElement = <HTMLVideoElement>document.getElementById('video');
let videoStore: string = ''

let threeFlag = false

// TIMELAPSE
let timelapseId: NodeJS.Timer


let eListener = <HTMLElement> document.getElementById('wrapper')
eListener.addEventListener('click', (()=>{
  if(!start) {
   initialize()
  }
}), false);

document.addEventListener('keydown', (e) => {
  if(threeFlag) {
    inputStrings = threeKeyDown(e, printStrings, socket)    
  } else {
    inputStrings = keyDown(e, printStrings, socket, ctx2d, canvas2d)
    printStrings = inputStrings  
  }
//  screenMaterial.map.needsUpdate = true
})

socket.emit('connectFromClient', 'client')

socket.on('stringsFromServer', (data: {
  strings: string,
  timeout: boolean
}) =>{
  if(threeFlag) {
    stringsToThree(data, inputStrings, printStrings)
  } else {
    printStrings = data.strings
    textPrint(printStrings, ctx2d, canvas2d)
  }
});
socket.on('erasePrintFromServer',() =>{
  if(threeFlag) {
    threeErasePrint()
  } else {
    erasePrint(ctx2d, canvas2d)
  }
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
  console.log(cmd)
  printStrings = cmd.cmd
  switch(cmd.cmd){
    case 'WHITENOISE':
      printStrings = cmd.cmd
      if(threeFlag) {
        threeErasePrint()
        threeTextPrint("WHITENOISE")
      } else {
        erasePrint(ctx2d, canvas2d)
        textPrint("WHITENOISE", ctx2d, canvas2d);
      }
      // if(cmd.fade && cmd.gain)
        whitenoise(cmd.flag, cmd.fade, cmd.gain)
      break;
    case 'SINEWAVE':
      if(threeFlag) {
        threeErasePrint()
        threeTextPrint(String(cmd.value) + 'Hz')
      } else {
        erasePrint(ctx2d, canvas2d)
        textPrint(String(cmd.value) + 'Hz', ctx2d, canvas2d);
      }
      printStrings = String(cmd.value) + 'Hz'
      // if(cmd.fade && cmd.gain && cmd.portament)
        sinewave(cmd.flag, cmd.value, cmd.fade, cmd.portament, cmd.gain)
      break;
    case 'FEEDBACK':
      if(threeFlag) {
        threeErasePrint()
        threeTextPrint('FEEDBACK')
      } else {
        erasePrint(ctx2d, canvas2d)
        textPrint("FEEDBACK", ctx2d, canvas2d);
      }
      // if(cmd.fade && cmd.gain)
        feedback(cmd.flag, cmd.fade, cmd.gain)
      break;
    case 'BASS':
      // if(cmd.gain)
        bass(cmd.flag, cmd.gain)
      if(threeFlag) {
        threeErasePrint()
        threeTextPrint("BASS")
      } else {
        erasePrint(ctx2d, canvas2d)
        textPrint("BASS", ctx2d, canvas2d);
      }
      break;
    case 'CLICK':
      // if(cmd.gain)
        click(cmd.gain)
      if(threeFlag) {
        threeErasePrint()
        threeTextPrint('CLICK')
      } else {
        erasePrint(ctx2d, canvas2d)
        textPrint('CLICK', ctx2d, canvas2d)
      }
      setTimeout(()=>{
        printStrings = '';
      },300);
      break;
  }
  inputStrings = '';
});

socket.on('stopFromServer', (fadeOutVal) => {
  stopCmd(fadeOutVal)
  if(threeFlag) {
    threeErasePrint()
    threeTextPrint('STOP')
    setTimeout(()=> {
      threeErasePrint()
      printStrings = ''
    },800)
  } else {
    erasePrint(ctx2d, canvas2d)
    textPrint('CSTOP', ctx2d, canvas2d)
    setTimeout(()=> {
      erasePrint(ctx2d, canvas2d)
      printStrings = ''
    },800)
  }

  /*
  erasePrint(threeCtx, threeCanvas)
  textPrint('STOP', threeCtx, threeCanvas)
  setTimeout(()=> {
    erasePrint(threeCtx, threeCanvas)
  },800)
  */
})

socket.on('textFromServer', (data: {text: string}) => {
  if(threeFlag) {
    threeErasePrint()
    threeTextPrint(data.text)
  } else {
    erasePrint(ctx2d, canvas2d)
    textPrint(data.text, ctx2d, canvas2d)
  }
});

socket.on('chatReqFromServer', () => {
  chatReq()
  setTimeout(() => {
    if(threeFlag) {
      threeErasePrint()
    } else {
      erasePrint(ctx2d, canvas2d)
    }
  },1000)
})

socket.on('recordReqFromServer', (data: {target: string, timeout:number}) => {
  recordReq(data)
  if(threeFlag){
    threeTextPrint('RECORD')
  } else {
    textPrint('RECORD', ctx2d, canvas2d)
  }
  setTimeout(() => {
    if(threeFlag) {
      threeErasePrint()
    } else {
      erasePrint(ctx2d, canvas2d)
    }
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
//  console.log(data.audio)
  playAudioStream(data.audio, data.sampleRate, data.glitch, data.bufferSize)
//  videoStore = data.video
//  console.log(videoStore)
  if(data.video) {
    if(threeFlag){
      reloadVideo(data.video);
    }
  }
//  showImage3d(data.video, threeCanvas)
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
  if(threeFlag) {
    threeErasePrint()
  } else {
    erasePrint(ctx2d, canvas2d)
  }
  playAudioStream(data.audio, data.sampleRate, data.glitch, data.bufferSize)
  console.log(data.video)
  if(data.video) {
    reloadVideo(data.video);
//    showImage3d(data.video, threeCanvas)
//    canvasMaterial.map.needsUpdate = true;
  } else {
    if(threeFlag) {
      threeTextPrint(data.source)
    } else {
      textPrint(data.source, ctx2d, canvas2d)
    }

    if(threeFlag) {
      canvasMaterialUpdate();
    }
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

socket.on('threeSwitchFromServer', (flag) => {
  console.log(flag)
  if(flag) {
    threeFlag = flag
    canvas2d.style.display ="none";
    initThree()  
    onWindowResize
  }
})

socket.on('addRoomFromServer', () => {
  addRoom()
})

socket.on('orientationFromServer', (deviceorientation) => {
  console.log(deviceorientation)
  orientationToThree(deviceorientation)
})

socket.on('fadeAwayFromServer', () => {
  fadeAway()
})


export const initialize = async () => {
    //erasePrint(threeCtx, threeCanvas)
    erasePrint(ctx2d, canvas2d)
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
      await textPrint('initialized', ctx2d, canvas2d)
      await setTimeout(() => {
        erasePrint(ctx2d, canvas2d)
      }, 500);
    } else {
//      textPrint('not support navigator.mediaDevices.getUserMedia')
    }
    
    start = true
    timelapseId = setInterval(() => {
      streamFlag.timelapse = true
    }, 60000)
  
    // initThree()
    // threeFlag = true
}

window.addEventListener('resize', ()=>{
  if(threeFlag) {
    onWindowResize
  } else {
    canvasSizing
  }
}, false)
canvasSizing()
textPrint('click screen', ctx2d, canvas2d)
