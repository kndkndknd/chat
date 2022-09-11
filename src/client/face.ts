import * as faceapi from 'face-api.js'

const videoEl = <HTMLVideoElement> document.getElementById( 'video' );
const canvas = <HTMLCanvasElement> document.getElementById( 'cnvs' );

const inputSize = 224;
const scoreThreshold = 0.5;
const options = new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold });

export async function initFace() {
  await faceapi.nets.tinyFaceDetector.load('/weight/')
  await faceapi.loadFaceLandmarkModel('/weight/')
}

export async function detectFace() {
  if(videoEl.paused || videoEl.ended || !faceapi.nets.tinyFaceDetector.params)
    return setTimeout(() => detectFace())

  console.log('test')
  const result = await faceapi.detectSingleFace(videoEl, options).withFaceLandmarks()
  if (result) {
    const dims = faceapi.matchDimensions(canvas, videoEl, true)
    const resizedResult = faceapi.resizeResults(result, dims)
    faceapi.draw.drawDetections(canvas, resizedResult)
    faceapi.draw.drawFaceLandmarks(canvas, resizedResult)
  }
  setTimeout(() => detectFace())
} 

/*
console.log("hello")

const canvas = <HTMLCanvasElement> document.getElementById( 'facecanvas' );
const videoEl = <HTMLVideoElement> document.getElementById( 'video' );
const inputSize = 224;
const scoreThreshold = 0.5;
const options = new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold });
    
async function onPlay()
{
  if(videoEl.paused || videoEl.ended || !faceapi.nets.tinyFaceDetector.params)
    return setTimeout(() => onPlay())

  const result = await faceapi.detectSingleFace(videoEl, options).withFaceLandmarks()
  if (result) {
    const dims = faceapi.matchDimensions(canvas, videoEl, true)
    const resizedResult = faceapi.resizeResults(result, dims)
    faceapi.draw.drawDetections(canvas, resizedResult)
    faceapi.draw.drawFaceLandmarks(canvas, resizedResult)
  }
  setTimeout(() => onPlay())
};
    
async function run(){
  await faceapi.nets.tinyFaceDetector.load('/weight/')
  await faceapi.loadFaceLandmarkModel('/weight/')
  const stream = await navigator.mediaDevices.getUserMedia({ video: {} })
  videoEl.srcObject = stream;
}

let eListener = <HTMLElement> document.getElementById('wrapper')
eListener.addEventListener('click', (()=>{
  run()
  onPlay()
}), false);
*/