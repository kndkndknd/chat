import * as faceapi from 'face-api.js'
import {initVideo, initVideoStream, canvasSizing, textPrint, erasePrint, showImage} from './imageEvent'


console.log("hello")

const canvas = <HTMLCanvasElement> document.getElementById( 'cnvs' );
const videoEl = <HTMLVideoElement> document.getElementById( 'video' );
const inputSize = 224;
const scoreThreshold = 0.5;
const options = new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold });
    
async function detectFace()
{
  if(videoEl.paused || videoEl.ended || !faceapi.nets.tinyFaceDetector.params)
    return setTimeout(() => detectFace())

  const result = await faceapi.detectSingleFace(videoEl, options).withFaceLandmarks()
  if (result) {
    const dims = faceapi.matchDimensions(canvas, videoEl, true)
    const resizedResult = faceapi.resizeResults(result, dims)
    faceapi.draw.drawDetections(canvas, resizedResult)
    faceapi.draw.drawFaceLandmarks(canvas, resizedResult)
  }
  setTimeout(() => detectFace())
};
    
async function initFace(){
  await faceapi.nets.tinyFaceDetector.load('/weight/')
  await faceapi.loadFaceLandmarkModel('/weight/')
  //const stream = await navigator.mediaDevices.getUserMedia({ video: {} })
  //videoEl.srcObject = stream;
}

let eListener = <HTMLElement> document.getElementById('wrapper')
eListener.addEventListener('click', (()=>{
  initialize()
}), false);


const initialize = async () => {

//  await initVideo(videoEl)
//  await initAudio()
//  videoEl.volume = 0


  const SUPPORTS_MEDIA_DEVICES = 'mediaDevices' in navigator
  if (SUPPORTS_MEDIA_DEVICES && navigator.mediaDevices.getUserMedia) {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const cameras = devices.filter((device) => device.kind === 'videoinput');
    if (cameras.length === 0) {
      throw 'No camera found on this device.'
    }
    console.log(cameras)
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
    await initVideoStream(stream, videoEl)
    await initFace()
    videoEl.srcObject = stream
    videoEl.volume = 0
    await detectFace()
  }  
}
