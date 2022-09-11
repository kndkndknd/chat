import { io, Socket } from 'socket.io-client';
const socket: Socket = io();
import {initAudio, initAudioStream, sinewave, whitenoise, feedback, bass, click, chatReq, playAudioStream, stopCmd, recordReq} from './webaudio'
import {keyDown} from './textInput'
import {textPrint, erasePrint, showImage, initVideoStream, initVideo} from './imageEvent'

const roomFileName = 'room'

// CHAT部分
let start = false
let printStrings = "";
let inputStrings = "";
let videoElement = <HTMLVideoElement>document.getElementById('video');
let videoStore: string = ''

let pos = {x:0,y:0,z:0}

let eListener = <HTMLElement> document.getElementById('wrapper')
eListener.addEventListener('click', (()=>{
  if(!start) {
   initialize()
  }
}), false);

document.addEventListener('keydown', (e) => {
  inputStrings = keyDown(e, printStrings, start, socket, ctx, canvas)
  printStrings = inputStrings
//  screenMaterial.map.needsUpdate = true
})

socket.emit('connectFromClient', 'client')

socket.on('stringsFromServer', (data: {
  strings: string,
  timeout: boolean
}) =>{
  scene.remove(videoMesh);
    erasePrint(ctx, canvas);
    console.log(data)
    inputStrings = data.strings
    printStrings = inputStrings
    textPrint(printStrings, ctx, canvas)
    if(data.timeout) {
      setTimeout(() => {
        erasePrint(ctx, canvas)
      }, 500)
    }
});
socket.on('erasePrintFromServer',() =>{
  erasePrint(ctx, canvas)
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
      erasePrint(ctx, canvas);
      textPrint("WHITENOISE", ctx, canvas);
      whitenoise(cmd.flag, cmd.fade, cmd.gain)
      break;
    case 'SINEWAVE':
      erasePrint(ctx, canvas);
      textPrint(String(cmd.value) + 'Hz', ctx, canvas);
      printStrings = String(cmd.value) + 'Hz'
      sinewave(cmd.flag, cmd.value, cmd.fade, cmd.portament, cmd.gain)
      break;
    case 'FEEDBACK':
      erasePrint(ctx, canvas);
      textPrint("FEEDBACK", ctx, canvas);
      feedback(cmd.flag, cmd.fade, cmd.gain)
      break;
    case 'BASS':
      bass(cmd.flag, cmd.gain)
      erasePrint(ctx, canvas);
      textPrint("BASS", ctx, canvas);
      break;
    case 'CLICK':
      click(cmd.gain)
      erasePrint(ctx, canvas)
      textPrint('CLICK', ctx, canvas)
      setTimeout(()=>{
        printStrings = '';
      },300);
      break;
  }
  inputStrings = '';
});

socket.on('stopFromServer', (fadeOutVal) => {
  stopCmd(fadeOutVal)
  printStrings = 'STOP'
  scene.remove(videoMesh);

  setTimeout(()=> {
    printStrings = ''
  },800)
  /*
  erasePrint(ctx, canvas)
  textPrint('STOP', ctx, canvas)
  setTimeout(()=> {
    erasePrint(ctx, canvas)
  },800)
  */
})

socket.on('textFromServer', (data: {text: string}) => {
  erasePrint(ctx, canvas)
  textPrint(data.text, ctx, canvas)
});

socket.on('chatReqFromServer', () => {
  chatReq()
  setTimeout(() => {
  erasePrint(ctx, canvas)
},1000)
})

socket.on('recordReqFromServer', (data: {target: string, timeout:number}) => {
  recordReq(data)
  textPrint('RECORD', ctx, canvas)
  setTimeout(() => {
  erasePrint(ctx, canvas)
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
    reloadVideo(data.video);
  }
//  showImage3d(data.video, canvas)
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
  erasePrint(ctx, canvas)
  playAudioStream(data.audio, data.sampleRate, data.glitch, data.bufferSize)
  console.log(data.video)
  if(data.video) {
    reloadVideo(data.video);
//    showImage3d(data.video, canvas)
//    canvasMaterial.map.needsUpdate = true;
  } else {
    textPrint(data.source, ctx, canvas)
    canvasMaterial.map.needsUpdate = true;
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

socket.on('addRoomFromServer', () => {
  particles.scale.set(8, 8, 8)
  scene.add(particles)
})

socket.on('orientationFromServer', (deviceorientation) => {
  console.log(deviceorientation)
  cameraControl = false
  camera.lookAt(new THREE.Vector3(
    deviceorientation.alpha, 
    deviceorientation.beta, 
    deviceorientation.gamma)
  );
})


export const initialize = async () => {
    erasePrint(ctx, canvas)
  
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
      printStrings = 'initialized'
///      await textPrint('initialized')
      await setTimeout(() => {
        printStrings = ''
      }, 500);
    } else {
//      textPrint('not support navigator.mediaDevices.getUserMedia')
    }
    
    start = true

    fbxLoader.load(
      'static/threeObjects/macbook/mpm_f21__Apple_MacBook_Pro_15.fbx',
      (object) => {
          // object.traverse(function (child) {
          //     if ((child as THREE.Mesh).isMesh) {
          //         // (child as THREE.Mesh).material = material
          //         if ((child as THREE.Mesh).material) {
          //             ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).transparent = false
          //         }
          //     }
          // })
          object.scale.set(.008, .008, .008)
//          object.scale.set(0.01,0.01,0.01)
          scene.add(object)
      },
      (xhr) => {
          console.log('macbook: ' + (xhr.loaded / xhr.total) * 100 + '% loaded')
      },
      (error) => {
          console.log(error)
      }
  )

  
  plyLoader.load(
      'static/threeObjects/' + roomFileName + '.ply',
      function (geometry) {
          //geometry.computeVertexNormals()
          particles = new THREE.Points(geometry, plyMaterial)
          // mesh.rotateX(-Math.PI / 2)
          /*
          particles.scale.set(8, 8, 8)
          scene.add(particles)
          */
      },
      (xhr) => {
          console.log('ply: ' + (xhr.loaded / xhr.total) * 100 + '% loaded')
          if(xhr.loaded === 1) {
            textPrint('initialized', ctx, canvas)
          }
      },
      (error) => {
          console.log(error)
      }
  )
  animate()
}
  
// three.js部分

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader'
//import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'



const scene = new THREE.Scene()

const light = new THREE.SpotLight()
light.position.set(10, 10, 10)
scene.add(light)

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    500
)
camera.position.z = 5
camera.position.y = 2

camera.lookAt(new THREE.Vector3(0, 0, 0));
let rot = 0;

const renderer = new THREE.WebGLRenderer()
renderer.outputEncoding = THREE.sRGBEncoding
renderer.setSize(window.innerWidth, window.innerHeight)
document.getElementById('wrapper').appendChild(renderer.domElement)

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
//const rtx = canvas.getContext('2d');

const fontSize = 560;

canvas.width = 2880;
canvas.height = 1800;

// canvasの下のバックスクリーンのMesh作成
/*
const backscreenGeometry = new THREE.PlaneGeometry(canvas.width / 1100, canvas.height / 1100);
const backscreenMaterial = new THREE.MeshBasicMaterial( { color: 0xffffff})
const backscreenMesh = new THREE.Mesh(backscreenGeometry, backscreenMaterial);
backscreenMesh.position.y = 1;
backscreenMesh.position.z = -1;
*/

// canvasのMesh作成
const canvasGeometry = new THREE.PlaneGeometry(canvas.width / 1100, canvas.height / 1100);
const canvasTexture = new THREE.CanvasTexture(canvas);
const canvasMaterial = new THREE.MeshBasicMaterial({
  map: canvasTexture
});

let canvasMesh = new THREE.Mesh(canvasGeometry, canvasMaterial);
canvasMesh.position.y = 1;
canvasMesh.position.z = -1;
canvasMesh.material.map.needsUpdate = true;
/*
ctx.fillStyle = 'white';
ctx.fillRect(0, 0, canvas.width, canvas.height);
*/
scene.add(canvasMesh);

const videoGeometry = new THREE.PlaneGeometry(canvas.width / 1100, canvas.height / 1100);
let loader = new THREE.TextureLoader();
let videoMaterial = new THREE.MeshStandardMaterial();
let videoMesh = new THREE.Mesh(videoGeometry, videoMaterial);


//const controls = new TrackballControls(camera)
//controls.rotateSpeed = 1.0
//controls.zoomSpeed = 1.0
//controls.panSpeed = 1.0
//controls.enableDamping = true

const controls = new OrbitControls(camera, renderer.domElement)

let cameraControl = true

const material = new THREE.PointsMaterial({
  vertexColors: true,//頂点の色付けを有効にする
  size: 0.005,
});

// const plyLoader = new PLYLoader()
//const objLoader = new OBJLoader()
const fbxLoader = new FBXLoader()

// particles
const plyLoader = new PLYLoader()
const plyMaterial = new THREE.PointsMaterial({
  vertexColors: true,//頂点の色付けを有効にする
  size: 0.03,
});
let particles: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>


window.addEventListener('resize', onWindowResize, false)
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  render()
}

function animate() {
  /*
    rot += 0.5; // 毎フレーム角度を0.5度ずつ足していく
    // ラジアンに変換する
    const radian = (rot * Math.PI) / 180;
    // 角度に応じてカメラの位置を設定
    camera.position.x = 10 * Math.sin(radian);
    camera.position.z = 10 * Math.cos(radian);
  */
//  freq = 440 + ((pos.x - camera.position.x)^2 + (pos.y - camera.position.y)^2 + (pos.z - camera.position.z)^2)
//    sinewave(true, freq, 0, 0, 1.0);

    //screenMaterial.map.needsUpdate = true;
    //canvasMesh.material.map.needsUpdate = true;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    /*
    if(videoStore.length > 0) {
    showImage3d(videoStore, canvas)
//      reloadVideo(videoStore)
    }
    */
    
    if(printStrings.length > 0) {
      textPrint(printStrings, ctx, canvas)
    }

//    textPrint(printStrings, ctx, canvas)
    canvasMaterial.map.needsUpdate = true;
  
//    requestAnimationFrame(update);
  

    requestAnimationFrame(animate)
  if(cameraControl) {
    controls.update()
  }

  render()
}
function render() {
  renderer.render(scene, camera)
}
/*
socket.on('stringsFromServer', (data: {
  strings: string,
  timeout: boolean
}) =>{
  textPrint(data.strings, ctx, canvas)
  console.log(data)
  printStrings = data.strings
  textPrint(printStrings, ctx, canvas)
  if(data.timeout) {
    setTimeout(() => {
      erasePrint(ctx, canvas)
    }, 500)
  }
  canvasMesh.material.map.needsUpdate = true;
});
*/

const reloadVideo = (img: string) => {
  let texture = loader.load(img);
  let videoMaterial = new THREE.MeshStandardMaterial({map: texture});
  scene.remove(videoMesh);

  videoMesh = new THREE.Mesh(videoGeometry, videoMaterial);
  videoMesh.position.y = 1;
  videoMesh.position.z = -1;
  
  /*
  videoMesh.position.x = 10 * (Math.random() - 0.5);
  videoMesh.position.y = 10 * (Math.random() - 0.5);
  videoMesh.position.z = -5 * Math.random();
  */
  videoMesh.material.map.needsUpdate = true;
  
  scene.add(videoMesh);
}

function showImage3d (url:string, receive: HTMLCanvasElement) {
  const image = new Image();
  image.src = url;
  // console.log('test')
  image.onload = function(){
    const aspect = image.width / image.height
    let hght = window.innerHeight
    let wdth = hght * aspect
    if(aspect > (window.innerWidth / window.innerHeight)) {
      hght = wdth / aspect
      wdth = window.innerWidth
    }
    const x = window.innerWidth /2 - (wdth / 2)
    const y = 0
    console.log("width:" + String(wdth) + ",height:" + String(hght) + ", x:"+ x + ", y:"+ y)
    //const receive = <HTMLCanvasElement> document.getElementById("cnvs");
    const vtx = receive.getContext('2d')
    vtx.drawImage(image, x, y, wdth, hght);
    let videoTexture = new THREE.Texture(canvas)
    videoTexture.needsUpdate = true
    /*
    let videoMaterial = new THREE.SpriteMaterial( { map: videoTexture, color: 0xffffff } );
    let videoSprite = new THREE.Sprite( videoMaterial )
    videoSprite.scale.set(200,200,200);
    videoSprite.position.set( 5,5,5)
    scene.add( videoSprite )
    */
    let videoMaterial = new THREE.MeshBasicMaterial({map: videoTexture})
    scene.remove(canvasMesh)
    canvasMesh = new THREE.Mesh(canvasGeometry, videoMaterial)
    canvasMesh.position.y = 10 * (Math.random());
    canvasMesh.position.z = -10 * (Math.random());
    scene.add(canvasMesh)
/*
ctx.fillStyle = 'white';
ctx.fillRect(0, 0, canvas.width, canvas.height);
*/
//scene.add(canvasMesh);

//    canvasMesh.material.map.needsUpdate = true
  }
}
