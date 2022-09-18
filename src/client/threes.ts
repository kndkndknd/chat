import {textPrint, erasePrint, showImage, initVideoStream, initVideo} from './imageEvent'
import {keyDown} from './textInput'

//Three 部分
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader'
//import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'

const roomFileName = 'lux'
const rotateY = 0
let printThreeStrings = ''

const scene = new THREE.Scene()
const threeCanvas = <HTMLCanvasElement> document.createElement('canvas');
const threeCtx = <CanvasRenderingContext2D> threeCanvas.getContext('2d');
threeCanvas.width = 2880;
threeCanvas.height = 1800;
threeCanvas.style.display = 'none'

// canvasのMesh作成
const canvasGeometry = new THREE.PlaneGeometry(threeCanvas.width / 1100, threeCanvas.height / 1100);
const canvasTexture = new THREE.CanvasTexture(threeCanvas);
const canvasMaterial = <THREE.MeshBasicMaterial> new THREE.MeshBasicMaterial({
  map: canvasTexture
});

const canvasMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> = new THREE.Mesh(canvasGeometry, canvasMaterial);
canvasMesh.position.y = 1;
canvasMesh.position.z = -1;
canvasMesh.material.map.needsUpdate = true;
scene.add(canvasMesh);

const videoGeometry = new THREE.PlaneGeometry(threeCanvas.width / 1100, threeCanvas.height / 1100);
let loader = new THREE.TextureLoader();
let videoMaterial = new THREE.MeshStandardMaterial();
let videoMesh = new THREE.Mesh(videoGeometry, videoMaterial);



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
//const rtx = threeCanvas.getContext('2d');
const controls = new OrbitControls(camera, renderer.domElement)

const fontSize = 560;


// canvasの下のバックスクリーンのMesh作成
/*
const backscreenGeometry = new THREE.PlaneGeometry(threeCanvas.width / 1100, threeCanvas.height / 1100);
const backscreenMaterial = new THREE.MeshBasicMaterial( { color: 0xffffff})
const backscreenMesh = new THREE.Mesh(backscreenGeometry, backscreenMaterial);
backscreenMesh.position.y = 1;
backscreenMesh.position.z = -1;
*/


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

let cameraControl = true
let pos = {x:0,y:0,z:0}

export const threeKeyDown = (e, printStrings, socket) => {
  return keyDown(e, printStrings, socket, threeCtx, threeCanvas)
}

export const threeErasePrint = () => {
  printThreeStrings = ''
  erasePrint(threeCtx, threeCanvas)
}

export const threeTextPrint = (text) => {
  console.log(text)
  printThreeStrings = text
  textPrint(text, threeCtx, threeCanvas);
}

export const stringsToThree = (data, inputStrings, printStrings) => {
  scene.remove(videoMesh);
  erasePrint(threeCtx, threeCanvas);
  console.log(data)
  inputStrings = data.strings
  printStrings = inputStrings
  printThreeStrings = printStrings
  console.log(printStrings)
  textPrint(printStrings, threeCtx, threeCanvas)
  if(data.timeout) {
    setTimeout(() => {
      erasePrint(threeCtx, threeCanvas)
    }, 500)
  }

}

export const removeMesh = () => {
  scene.remove(videoMesh);
}

export const canvasMaterialUpdate = () => {
    canvasMaterial.map.needsUpdate = true
}

export function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  render()
}


// three.js部分
export const initThree = () => {
  threeCanvas.style.display = 'block'
  threeCanvas.style.zIndex = '4'
  renderer.outputEncoding = THREE.sRGBEncoding
  renderer.setSize(window.innerWidth, window.innerHeight)

  const wrapperElement = <HTMLElement> document.getElementById('wrapper')
  wrapperElement.appendChild(renderer.domElement)
  
  fbxLoader.load(
    'static/threeObjects/macbook/mpm_f21__Apple_MacBook_Pro_15.fbx',
    (object) => {
        object.scale.set(.008, .008, .008)
        scene.add(object)
    },
    (xhr) => {
        console.log('macbook: ' + (xhr.loaded / xhr.total) * 100 + '% loaded')
    },
    (error) => {
        console.log(error)
    })

/*
  plyLoader.load(
      'static/threeObjects/' + roomFileName + '.ply',
      function (geometry) {
          geometry.rotateY(rotateY);
          particles = new THREE.Points(geometry, plyMaterial)
      },
      (xhr) => {
          console.log('ply: ' + (xhr.loaded / xhr.total) * 100 + '% loaded')
          if(xhr.loaded === 1) {
            printThreeStrings = '3D Model Loaded.'
            textPrint('3D Model Loaded.', threeCtx, threeCanvas)
          }
      },
      (error) => {
          console.log(error)
      }
  )
*/
animate()

}



function render() {
  renderer.render(scene, camera)
}

export const reloadVideo = (img: string) => {
  let texture = loader.load(img);
  let videoMaterial = new THREE.MeshStandardMaterial({map: texture});
  scene.remove(videoMesh);

  videoMesh = new THREE.Mesh(videoGeometry, videoMaterial);
  videoMesh.position.y = 1;
  videoMesh.position.z = -1;
  
  if(videoMesh.material.map)
    videoMesh.material.map.needsUpdate = true;
  
  scene.add(videoMesh);
}

export const orientationToThree = (deviceorientation) => {
  /*
  cameraControl = false
  camera.lookAt(new THREE.Vector3(
    deviceorientation.alpha, 
    deviceorientation.beta, 
    deviceorientation.gamma)
  );
  */
}

export const addRoom = () => {
  particles.scale.set(8, 8, 8)
  scene.add(particles)
}

/*
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
    if(vtx)
      vtx.drawImage(image, x, y, wdth, hght);
    let videoTexture = new THREE.Texture(threeCanvas)
    videoTexture.needsUpdate = true
    let videoMaterial = new THREE.MeshBasicMaterial({map: videoTexture})
    scene.remove(canvasMesh)
    canvasMesh = new THREE.Mesh(canvasGeometry, videoMaterial)
    canvasMesh.position.y = 10 * (Math.random());
    canvasMesh.position.z = -10 * (Math.random());
    scene.add(canvasMesh)
  }
}
*/
function animate() {
    threeCtx.fillStyle = 'white';
    threeCtx.fillRect(0, 0, threeCanvas.width, threeCanvas.height);
    if(printThreeStrings.length > 0) {
      textPrint(printThreeStrings, threeCtx, threeCanvas)
    }
    canvasMaterial.map.needsUpdate = true;
    requestAnimationFrame(animate)
  // if(cameraControl) {
    controls.update()
  // }

  render()
}
export const fadeAway = () => {
  /*
  const fadeAwayInterval = setInterval(() => {
    camera.position.z = camera.position.z + 0.025
    camera.position.y = camera.position.y + 0.025
  },100)
  */
}