export function textPrint(ctx, canvas, text, DarkMode, playHLS) {
//export function textPrint(ctx:CanvasRenderingContext2D, canvas:HTMLCanvasElement, text:string) {
  // console.log(DarkMode)
  // console.log(text)
  let fontSize = 20
  let zenkakuFlag = false
  /*
  if (text.match(/^[^\x01-\x7E\xA1-\xDF]+$/)) {
    fontSize = 16
    console.log(text)
  } 
  */ 
  ctx.globalAlpha = 1
  ctx.fillStyle = "black"
  let textArr = [text]
  let textLength = 0
  Array.prototype.forEach.call(text, (s,i)=> {
    let chr = text.charCodeAt(i)
    if((chr >= 0x00 && chr < 0x81) || (chr === 0xf8f0) || (chr >= 0xff61 && chr < 0xffa0) || (chr >= 0xf8f1 && chr < 0xf8f4)){
      textLength += 1;
    }else{
      textLength += 2;
      zenkakuFlag = true
    }
  })
  if(textLength > 20) {
    if(zenkakuFlag){
      fontSize = Math.floor((canvas.width * 4 / 3) / 24)
    } else {
      fontSize = Math.floor((canvas.width * 4 / 3) / 18)
    }
    textArr = [""]
    let lineNo = 0
    Array.prototype.forEach.call(text, (element,index) =>{
      if(index % 16 > 0 || index === 0) {
        textArr[lineNo] += element
        //console.log(textArr[lineNo])
      } else {
        textArr.push(element)
        lineNo += 1
        //console.log(textArr[lineNo])
      }
    });
  } else if(textLength > 2) {
    fontSize = Math.floor((canvas.width * 4 / 3) / textLength)
  } else {
    fontSize = Math.floor((canvas.height * 5 / 4) / textLength)
  }
  ctx.font = "bold " + String(fontSize) + "px 'Arial'";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = "white"
  if(textArr.length === 1) {
    ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  } else {
    textArr.forEach((element, index) => {
      //console.log("line" + String(index))
      // console.log(element)
      ctx.strokeText(element, canvas.width / 2, canvas.height / 2 + (fontSize * (index - Math.round(textArr.length / 2))));
      ctx.fillText(element, canvas.width / 2, canvas.height / 2 + (fontSize * (index - Math.round(textArr.length / 2))));
    })
  }
  ctx.restore();
}

export function erasePrint(ctx, canvas) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

export function toBase64(buffer, video){
  let bufferContext = buffer.getContext('2d');
  buffer.width = video.videoWidth;
  buffer.height = video.videoHeight;
  bufferContext.drawImage(video, 0, 0);
  //return buffer.toDataURL("image/webp");
  const returnURL = buffer.toDataURL("image/jpeg")
  return returnURL
  // return buffer.toDataURL("image/jpeg");
}

export function playHLS(video){
  video.play()
  console.log("debug")
  console.log(video.videoWidth)
  /*
  let width = video.videoWidth
  let height = video.videoHeight
  if(video.videoWidth > video.videoHeight * 16 / 9) {
    height = video.videoHeight * width / video.videoWidth
  } else {
    width = video.videoWidth * height / video.videoHeight
  }
  */
  let width = window.innerWidth
  let height = video.videoHeight * width / video.videoWidth
  if(height > window.innerHeight) {
    height = window.innerHeight
    width = video.videoWidth * height / video.videoHeight
  }
  /*
  if(video.videoWidth > video.videoHeight * 16 / 9) {
    height = height * video.videoWidth / width
  } else {
    width = width * video.videoHeight / height
  }
  */
  console.log(width)
  console.log(height)
  document.getElementById("bckCnvs").setAttribute("height", String(height) + "px")
  document.getElementById("bckCnvs").setAttribute("width", String(width) + "px")
  /*
  const margin = {
    x: (window.innerWidth - width) / 2,
    y: (window.innerHeight - height) / 2,
  }
  console.log(margin)
  document.getElementById("bckCnvs").setAttribute("styles", "margin-left: " + margin.x + "px; margin-top: " + margin.y + "px;")
  */
  const HLSprocessor = {
    ctx: document.getElementById("bckCnvs").getContext("2d"),
    width: width,
    height: height
  /*  width: window.innerWidth,
    height: window.innerHeight*/
  }
  // console.log(HLSprocessor)
  video.addEventListener("play", function() {
  // HLSprocessor.video.addEventListener("play", function() {
    timerCallback(video, HLSprocessor);
  }, false);
}

const timerCallback = (video, HLSprocessor) => {
  if (video.paused || video.ended) {
  // if (HLSprocessor.video.paused || HLSprocessor.video.ended) {
    return;
  }
  console.log(HLSprocessor.ctx)
  HLSprocessor.ctx.drawImage(video, 0, 0, HLSprocessor.width, HLSprocessor.height);
  var frame = HLSprocessor.ctx.getImageData(0, 0, HLSprocessor.width, HLSprocessor.height);
  var l = frame.data.length / 4;
  HLSprocessor.ctx.putImageData(frame, 0, 0);
  setTimeout(function () {
    timerCallback(video, HLSprocessor);
  // }, 16); // roughly 60 frames per second
  }, 42); // roughly 24 frames per second
}


//ThreeJS。そのうちexportする

let texture;
let material;
let renderer;
let scene;
let camera;
let loader;
let box
let plane;
let geometry;
// let geometryList = [];
let geometryObj = {};
function thr() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  // レンダラーを作成
  renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('#three'),
    alpha: true
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);

  // シーンを作成
  scene = new THREE.Scene();

  // カメラを作成
  camera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
  camera.position.set(0,0,+1000);
  //const controls = new THREE.OrbitControls(camera);
  const controls = new THREE.OrbitControls(camera, renderer.domElement);

  //const geometry1 = new THREE.BoxGeometry(500,500,5);
  loader = new THREE.TextureLoader();
  texture = loader.load("files/knd.jpg");
  material = new THREE.MeshStandardMaterial({
    map: texture,
    transparent: true
  });
  /*
  geometry = new THREE.BoxGeometry(window.innerWidth,window.innerHeight,5);
  box = new THREE.Mesh(geometry, material);
  scene.add(box);
  */
  const dummyObj = {
    "CHAT": {
      "VIDEO": ["a","b","c"],
      "audio": [1,2,3]
    },
    "PLAYBACK": {
      "VIDEO": ["a","b","c"],
      "audio": [1,2,3]
    }
  }
  let value = "CHAT"
//  let chatGeometry = new THREE.BoxGeometry(50, 50, 50)
 // let chatMesh = new THREE.Mesh(value, material);
 /*
      geometryObj[value] = {}
      geometryObj[value].geometry = new THREE.BoxGeometry(50, 50, 50)
      geometryObj[value].mesh = new THREE.Mesh(geometryObj[value].geometry, material);
      scene.add(geometryObj[value].mesh)
      geometryObj[value].mesh.position.x = Math.sin((1) * Math.PI * 2);
      geometryObj[value].mesh.position.y = Math.cos((1) * Math.PI * 2);
      */
  const ObjLength = Object.keys(dummyObj).length
  if(ObjLength > 0) {
    Object.keys(dummyObj).forEach((value, index) =>{
      console.log(value)
      geometryObj[value] = {}
      geometryObj[value].geometry = new THREE.BoxGeometry((index+1)*100, (index+1)*100, (index+1)*100)
      geometryObj[value].mesh = new THREE.Mesh(geometryObj[value].geometry, material);
      scene.add(geometryObj[value].mesh)
      geometryObj[value].mesh.position.x = Math.sin(((index+1) / dummyObj.length) * Math.PI * 200);
      geometryObj[value].mesh.position.y = Math.cos(((index+1) / dummyObj.length) * Math.PI * 200);
    })
  }
  /*
  geometryList = [
    new THREE.BoxGeometry(100,100,5),
    new THREE.BoxGeometry(150,150,5),
    new THREE.BoxGeometry(50,50,5)
  ]
  */
  /*for(let key in geometryObj) {
    const mesh = new THREE.Mesh(geometryObj[key], material);
    scene.add(mesh)

    mesh.position.x = Math.sin((index / geometryObj.length) * Math.PI * 2);
    mesh.position.y = Math.cos((index / geometryObj.length) * Math.PI * 2);

  }*/
  /*
  geometryList.map((geo, index) => {
    const mesh = new THREE.Mesh(geo, material);
    scene.add(mesh)

    mesh.position.x = Math.sin((index / geometryList.length) * Math.PI * 2);
    mesh.position.y = Math.cos((index / geometryList.length) * Math.PI * 2);
  })
  */

  //平行光源
  const light = new THREE.AmbientLight(0xFFFFFF);
  light.intensity = 1;
  light.position.set(1,1,1);
  //シーンに光源を追加
  scene.add(light);

  loader = new THREE.TDSLoader();
  /*
  loader.setPath('files/textures/');
  loader.load('files/portalgun/portalgun.3ds', object => {
    scene.add(object);
  });
  */
  //console.log(material); 
  //初回実行
  tick();
  //console.log(box);
}

//毎フレームごとに実行されるループイベント
function tick() {
  //箱を回転させる
  // box.rotation.x += 0.01;
  // box.rotation.y += 0.006;
  //geometryList[0].rotation.x += 0.1;
  geometryObj.CHAT.mesh.rotation.x += 0.1;

  //レンダリング
  renderer.render(scene, camera);

  requestAnimationFrame(tick);
}

const reloadTexture = (img) => {
//  console.log(img);
  erasePrint(stx, strCnvs);
  erasePrint(ctx, cnvs);
  let boxX = box.rotation.x
  let boxY = box.rotation.y
  loader = new THREE.TextureLoader();
  texture = loader.load(img);
  console.log(material);
  //material.map.image.src = img;
  material.map = texture;
  /*
  material = new THREE.MeshStandardMaterial({
    map: texture
  });
  scene.remove(box);
  box = new THREE.Mesh(geometry, material);
  console.log(box)
  box.rotation.x = boxX;
  box.rotation.y = boxY;
  scene.add(box);
  */
}