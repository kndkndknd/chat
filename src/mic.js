const modules = require('./module.js');
console.log(socket)
let cmdMode = {}
const userAgent = window.navigator.userAgent.toLowerCase()
if(userAgent.indexOf('iphone') != -1 || userAgent.indexOf('android') != -1) {
  cmdMode.mobile = true
} else {
  cmdMode.mobile = false
}
let start = false

// voice
const ssu = new SpeechSynthesisUtterance();
ssu.lang = 'en-EN';
ssu.rate = 0.7
let voice =false;
let text2No = 0

//video record/play ここから
let image;
let receive;
let receive_ctx;
let loopFlag = true
let loopCount = Math.random() * 10

let video
let video_track

const initialize = () =>{
  modules.erasePrint(stx, strCnvs);
  //socket.emit("startFromClient")
  start = true
  console.log("start")

  //face detect
  video = document.getElementById('video');
  video.width  = 640;
  video.height = 480
  video_track = null
  video.play();
};

//keyboard
let stringsClient = "";
/*
const keyDown = (e) => {
  console.log(e.keyCode);
  let charCode = keyMap[e.keyCode]
  if(charCode === "enter" && !start) initialize()
  if(!standAlone) {
    if(charCode === "enter" && (stringsClient === "LOCAL" || stringsClient === "STANDALONE" || stringsClient === "NETWORK" || stringsClient === "CONNECT")){
      standAlone = true;
      modules.erasePrint(stx, strCnvs);
      modules.textPrint(stx, strCnvs, "stand alone");
      socket.emit('charFromClient', 40)
      stringsClient = ""
      setTimeout(()=>{
        modules.erasePrint(stx, strCnvs);
      },300);
    } else {
      stringsClient = modules.keyDownFunc(e.keyCode, charCode, stringsClient, socket);
      modules.erasePrint(stx, strCnvs);
      modules.textPrint(stx, strCnvs, stringsClient);
      if(e.keyCode === 13 && stringsClient === "VOICE"){
        if(voice){
          voice = false;
          modules.erasePrint(stx, strCnvs);
          modules.textPrint(stx, strCnvs, "VOICE OFF");
          stringsClient = "";
          setTimeout(()=>{
            modules.erasePrint(stx, strCnvs);
            //modules.charEmit(37, socket);
            socket.emit('charFromClient', 40)
          },500);
        } else {
          voice = true;
          modules.erasePrint(stx, strCnvs);
          modules.textPrint(stx, strCnvs, "VOICE MODE");
          stringsClient = "";
          setTimeout(()=>{
            socket.emit('charFromClient', 40)
            //modules.charEmit(37, socket);
          },500);
        }

      }
    }
  } else { //STANDALONE
    if(charCode === "enter"){
      if(stringsClient === "LOCAL" || stringsClient === "STANDALONE" || stringsClient === "NETWORK" || stringsClient === "CONNECT"){
        standAlone = false;
        modules.erasePrint(stx, strCnvs);
        modules.textPrint(stx, strCnvs, "network connect");
        setTimeout(()=>{
          modules.erasePrint(stx, strCnvs);
        },300);
      } else {
        if (isNaN(Number(stringsClient)) === false && stringsClient != "") {
          doCmd({
            "cmd":"SINEWAVE",
            "property": Number(stringsClient)
          });
//          console.log("sinewave stand alone")
        } else if(stringsClient === "RECORD" || stringsClient === "REC") {
          const prevVidMode = videoMode.mode
          videoMode.mode = "pastBuff"
          modules.erasePrint(stx, strCnvs);
          modules.textPrint(stx, strCnvs, "RECORD");
          console.log(videoMode.mode)
          stringsClient = ""
          setTimeout(()=>{
            videoMode.mode = prevVidMode
            modules.erasePrint(stx, strCnvs)
          },10000)
        } else if(stringsClient === "PLAYBACK" || stringsClient === "PLAY") {
          modules.erasePrint(stx, strCnvs);
          modules.textPrint(stx, strCnvs, "PLAYBACK");
          setTimeout(()=>{
            videoMode.mode = "playback"
            modules.erasePrint(stx, strCnvs);
          },300);
          stringsClient = ""
        } else {
          if(~stringsClient.indexOf(" ") ) {
            const strArr = stringsClient.split(" ")
            doCmd({"cmd":strArr[0], "property": strArr[1]})
          } else {
            doCmd({"cmd":stringsClient})
          }
        }
      }
    } else if(charCode === "escape") {
      doCmd({"cmd":"STOP"});
      stringsClient = "";
    } else if(charCode === "down_arrow"){
      stringsClient = "";
      modules.erasePrint(stx, strCnvs);
    } else if(charCode === "left_arrow"){
      stringsClient = stringsClient.slice(0,-1)
      modules.erasePrint(stx, strCnvs);
      modules.textPrint(stx, strCnvs, stringsClient);
    } else if(e.keyCode >= 48 && e.keyCode <= 90 || e.keyCode === 190 || e.keyCode === 189 || e.keyCode === 32 || e.keyCode === 16){
      stringsClient = stringsClient + charCode
      modules.erasePrint(stx, strCnvs);
      modules.textPrint(stx, strCnvs, stringsClient);
    }
  }
}
*/

//window.addEventListener("load", initialize, false);
let eListener = document.getElementById("wrapper")
eListener.addEventListener("click", (()=>{
  if(!start) initialize()
}), false);
window.addEventListener('resize', (e) =>{
  console.log('resizing')
  sizing()
})
/*
document.addEventListener('keydown', (e) => {
  console.log(e)
  keyDown(e)
})
*/
let textListner = document.getElementById("micText")
textListner.addEventListener('input', ((e) => {
  console.log(e.target.value)
  socket.emit("micFromClient", e.target.value)
}))



// 関数
// canvas

let canvas = document.getElementById('cnvs');
let ctx = canvas.getContext('2d');
let strCnvs = document.getElementById('strCnvs');
let stx = strCnvs.getContext('2d');
let buffer;
let bufferContext;

const sizing =() =>{
  document.getElementById("cnvs").setAttribute("height", String(window.innerHeight / 2) + "px")
  document.getElementById("cnvs").setAttribute("width", String(window.innerWidth) + "px")
  document.getElementById("strCnvs").setAttribute("height", String(window.innerHeight / 2) + "px")
  document.getElementById("strCnvs").setAttribute("width", String(window.innerWidth / 2) + "px")
}

sizing();
/*
const renderStart=()=> {
  video = document.getElementById('video');
  buffer = document.createElement('canvas');
  bufferContext = buffer.getContext('2d');

  let render = () => {
    requestAnimationFrame(render);
    let width = video.videoWidth;
    let height = video.videoHeight;
    if(width == 0 || height ==0) {return;}
    buffer.width = width;
    buffer.height = height;
    bufferContext.drawImage(video, 0, 0);
  }
  render();
}
let streamFlag = false
*/
// socket
socket.emit('connectFromClient', "mic");
socket.on('connectFromServer', (data) => {
  /*rhythmProperty = data.clientStatus.rhythm
  for(let key in data.streamFlag) {
    if(data.streamFlag[key]) streamFlag = true
  }
  */
})
socket.on('stringsFromServer', (data) =>{
  //modules.erasePrint(stx, strCnvs)
  stx.clearRect(0, 0, strCnvs.width, strCnvs.height);
  console.log(data)
  stringsClient = data
  modules.textPrint(stx,strCnvs, stringsClient)
  document.getElementById("micText").value = data
});
socket.on('erasePrintFromServer',() =>{
  //stx.clearRect(0, 0, strCnvs.width, strCnvs.height);
  modules.erasePrint(stx,strCnvs)
  modules.whitePrint(ctx,canvas)
});

socket.on('textFromServer', (data) => {
  modules.erasePrint(stx, strCnvs)
  modules.textPrint(stx,strCnvs, data.text)
  speakVoice(data.text)
  stringsClient = "";
  if("timeout" in data && data.timeout) {
    setTimeout(()=>{modules.erasePrint(stx,strCnvs)},500)
  }
});

const speakVoice = (data) =>{
  if(voice && data != "VOICE" && data != undefined){
    ssu.text = data;
    speechSynthesis.speak(ssu);
  }
}

modules.textPrint(stx, strCnvs, "click screen")
