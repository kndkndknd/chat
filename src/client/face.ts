import * as faceapi from 'face-api.js'
import { io, Socket } from 'socket.io-client';
const socket: Socket = io();

import {canvasSizing, clearTextPrint, erasePrint } from './imageEvent'
import {cnvs, ctx, } from './globalVariable'
import exp from 'constants';
import {sevenSinsType} from '../types/global'


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

const faceCanvas = <HTMLCanvasElement> document.getElementById( 'bckcnvs' );
const faceCtx  = <CanvasRenderingContext2D>faceCanvas.getContext('2d')

const videoEl = <HTMLVideoElement> document.getElementById( 'video' );
const inputSize = 224;
const scoreThreshold = 0.8;
const options = new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold });
//videoEl.volume = 0.01;
    
async function onPlay()
{
  if(videoEl.paused || videoEl.ended || !faceapi.nets.tinyFaceDetector.params)
    return setTimeout(() => onPlay())

  const result = await faceapi.detectSingleFace(videoEl, options).withFaceLandmarks().withFaceExpressions()
//  const detections = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions()).withFaceExpressions()
  if (result) {
    const dims = faceapi.matchDimensions(faceCanvas, videoEl, true)
    const resizedResult = faceapi.resizeResults(result, dims)
//    console.log(resizedResult)
    console.log(resizedResult.landmarks.positions)
    console.log(resizedResult.alignedRect.box)
    console.log(resizedResult.alignedRect.score)
    // resizedResult.landmarks.
      faceapi.draw.drawFaceLandmarks(faceCanvas, resizedResult)
      socket.emit('faceFromClient',{
        detection: true,
        box: resizedResult.alignedRect.box,
        score: resizedResult.alignedRect.score
      })
      const expression: sevenSinsType = judgeExpression(result, 0.9)
      if(expression !== "no expression"){
        // canvas
        erasePrint(ctx, cnvs)
        // clearTextPrint(expression, ctx, cnvs)
        console.log(expression)
        socket.emit('expressionFromClient', expression)
      } else {
        erasePrint(ctx, cnvs)
      }
  
    // faceapi.draw.drawDetections(faceCanvas, resizedResult)
  } else {
    erasePrint(faceCtx, faceCanvas)

    console.log('not ditected')
    socket.emit('faceFromClient',{
      detection: false
    })
}
  setTimeout(() => onPlay())
};
    
async function run(){
  socket.emit('debugFromClient')
  await faceapi.nets.tinyFaceDetector.load('/model/')
  await faceapi.nets.faceExpressionNet.loadFromUri('./model/')
  await faceapi.loadFaceLandmarkModel('/model/')
  const devices = await navigator.mediaDevices.enumerateDevices()
  const cameras = devices.filter((device) => device.kind === 'videoinput');
  if (cameras.length === 0) {
    throw 'No camera found on this device.'
  }
  console.log(cameras)
const stream = await navigator.mediaDevices.getUserMedia({ video: {} })
  videoEl.srcObject = stream;
}

let eListener = <HTMLElement> document.getElementById('wrapper')
eListener.addEventListener('click', (()=>{
  run()
  onPlay()
}), false);

window.addEventListener('resize', (e) =>{
  console.log('resizing')
  canvasSizing()
})
canvasSizing();



function judgeExpression(data, expressionThreshold) {
  let expr: sevenSinsType
  expr = "no expression"
  if (data.expressions.happy > expressionThreshold) {
    expr = "greed" // 強欲
  }

  if (data.expressions.sad >= expressionThreshold) {
    expr = "envy" // 嫉妬
  }
  if (data.expressions.angry >= expressionThreshold){
    expr = "wrath" // 憤怒
  }
  if (data.expressions.surprised >= expressionThreshold){
    expr = "lust" // 色欲
  }
  if (data.expressions.neutral >= expressionThreshold){
    expr = "gluttony" // 暴食
  }
  if (data.expressions.fearful >= expressionThreshold){
    expr = "pride" //傲慢
  }
  if (data.expressions.dusgusted >= expressionThreshold){
    expr = "sloth"  //怠惰
  }

  return expr;
};
