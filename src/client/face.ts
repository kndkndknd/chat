import * as faceapi from 'face-api.js'

/*
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
*/
console.log("hello")

const canvas = <HTMLCanvasElement> document.getElementById( 'cnvs' );
const videoEl = <HTMLVideoElement> document.getElementById( 'video' );
const inputSize = 224;
const scoreThreshold = 0.5;
const options = new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold });
videoEl.volume = 0.01;
    
async function onPlay()
{
  if(videoEl.paused || videoEl.ended || !faceapi.nets.tinyFaceDetector.params)
    return setTimeout(() => onPlay())

  const result = await faceapi.detectSingleFace(videoEl, options).withFaceLandmarks().withFaceExpressions()
//  const detections = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions()).withFaceExpressions()
  if (result) {
    const dims = faceapi.matchDimensions(canvas, videoEl, true)
    const resizedResult = faceapi.resizeResults(result, dims)
    console.log(resizedResult.landmarks.positions)
    console.log(resizedResult.landmarks.getLeftEye())
    // resizedResult.landmarks.
    faceapi.draw.drawDetections(canvas, resizedResult)
    faceapi.draw.drawFaceLandmarks(canvas, resizedResult)
    console.log(judgeExpression(result))
  } else {
    console.log('not ditected')
  }
  setTimeout(() => onPlay())
};
    
async function run(){
  await faceapi.nets.tinyFaceDetector.load('/model/')
  await faceapi.nets.faceExpressionNet.loadFromUri('./model/')
  await faceapi.loadFaceLandmarkModel('/model/')
  const stream = await navigator.mediaDevices.getUserMedia({ video: {} })
  videoEl.srcObject = stream;
}

let eListener = <HTMLElement> document.getElementById('wrapper')
eListener.addEventListener('click', (()=>{
  run()
  onPlay()
}), false);


function judgeExpression(data) {

  if (data.expressions.happy >= 0.8) {
      return "happy"
  };

  if (data.expressions.sad >= 0.8) {
      return "sad"
  }
  if (data.expressions.angry >= 0.8){
      return "angry"
  }
  if (data.expressions.surprised >= 0.8){
      return "suprised"
  }

  return "no_expression";
};
