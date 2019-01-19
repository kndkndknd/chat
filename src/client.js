const modules = require('./module.js');
console.log(socket)

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;

let audioContext
let masterGain
let lpFilter
let feedbackGain
let filter
let javascriptnode
let osc
let oscGain
let bassOsc
let bassGain
let clickOsc
let clickGain
let whitenoise
let whitenoiseNode
let noiseGain
let buf0
let buf1

let chatGain
let convolver
let revGain

let gainVal = {
  "master": 0.7,
  "FEEDBACK": 1,
  "OSC": 1,
  "BASS": 0.7,
  "CLICK": 0.7,
  "NOISE": 0.3,
  "CHAT": 1,
  "PLAYBACK": 0.7,
  "TIMELAPSE": 0.7,
  "DRUM": 0.7,
  "SECBEFORE": 0.7,
  "SILENCE": 0
}
let fadeVal = {
  "IN": 0,
  "OUT": 0
}

let prevGain = 0.7;

let oscPortament = 0;
let streamBuffer = [];
let lookBackBuffer = [];
let loopBuffer = {}
let bufferSize = 8192;
let bufferRate = 48000;
let chatBuffer = {};

let droneBuff = {};
let timelapseFlag = false;
let playsampleRate = 48000
let playTarget = ""
let localSampleRate = 0

let tileFlag = false

// voice
const ssu = new SpeechSynthesisUtterance();
ssu.lang = 'en-EN';
let voice =false;

const modList= [0.5, 0.5, 1, 18];
const chordList = [1, 4/3, 9/4, 15/8, 17/8, 7/3, 11/3];
let chordChange = 0;
let modChange = 0;
let freqVal;

// alert sound
let alertBuffer = null;

//face detect
let ctracker = new clm.tracker();
let ctrackerMode = false
const alertPlay = () => {
  let src = audioContext.createBufferSource();
  src.buffer = alertBuffer;
  src.connect(audioContext.destination);
  src.start();
  // console.log("alert");
}
const click = (frequency) => {
  let currentTime = audioContext.currentTime
  if(frequency){
    clickOsc.frequency.setValueAtTime(frequency,0)
  } else {
    clickOsc.frequency.setValueAtTime(440,0)
  }
  //clickOsc.frequency.value = frequency || 440
  modules.textPrint(stx, strCnvs, "CLICK")
//  clickGain.gain.value = 0.7;
  clickGain.gain.setValueAtTime(gainVal["CLICK"], currentTime);
  clickGain.gain.setTargetAtTime(0,currentTime,0.03);
  setTimeout(()=>{
    modules.erasePrint(stx, strCnvs);
    // modules.textPrint(stx, strCnvs, "");
  },300);
}

const loadSample = (ctx, url) => {
  let req = new XMLHttpRequest();
  req.open("GET", url, true);
  req.responseType = "arraybuffer";
  req.onload = () => {
    if(req.response) {
      ctx.decodeAudioData(req.response).then(function(b){alertBuffer=b;},function(){});
    }
  }
  req.send();
}

const bassLine = {
  "LOW": [55,55,68.75,73.4,82.4,82.4],
  "HIGH": [98,103.8,110,110]
};
let bassFlag = false;

const bass = (position)  => {
  let currentTime = audioContext.currentTime
  if(bassFlag){
    //bassGain.gain.value = 0;
    bassGain.gain.setTargetAtTime(0,currentTime,0.02);
    bassFlag = false;
    modules.erasePrint(stx, strCnvs);
  } else {
    modules.erasePrint(stx, strCnvs);
    // console.log("vass");
    modules.textPrint(stx, strCnvs, "BASS");
    bassOsc.frequency.setTargetAtTime(bassLine[position][Math.floor(bassLine[position].length * Math.random())],currentTime,0.01)
    bassGain.gain.setTargetAtTime(gainVal.BASS,currentTime,0.02);
    bassFlag = true;
  }
}

const filterChange = () => { //LPF
  let returnValue = 0;
  let currentTime = audioContext.currentTime
  switch(lpFilter.frequency.value){
    case 20000:
      returnValue = 220;
      break;
    case 220:
      returnValue = 1760;
      break;
    default:
      returnValue = 20000;
      break;
  }
  lpFilter.frequency.setTargetAtTime(returnValue,currentTime,0)
  return returnValue;
}

//video record/play ここから


let image;
let receive;
let receive_ctx;
const onAudioProcess = (e) => {
  if(videoMode.mode != "none" && videoMode.mode != "wait"){
    //consol.log(videoMode);
    let bufferData = new Float32Array(bufferSize);
    e.inputBuffer.copyFromChannel(bufferData, 0);
    if(videoMode.mode === "record"){
      if(videoMode.option === "none") {
        socket.emit('chunkFromClient', {"audio":bufferData, "video":funcToBase64(buffer, video), "target": "PLAYBACK"})
      } else {
        socket.emit('chunkFromClient', {"audio":bufferData, "video":funcToBase64(buffer, video), "target": videoMode.option})
      }
    } else if(videoMode.option === "loop" && videoMode.mode === "chat"){
        //console.log(loopBuffer)
        if("audio" in chatBuffer) {
          playAudioStream(chatBuffer.audio,bufferRate,1,false);
        //if("audio" in loopBuffer) {
          //playAudioStream(loopBuffer.audio,bufferRate,1,false);
        }
        if("video" in chatBuffer){
          playVideo(chatBuffer["video"]);
        //if("video" in loopBuffer){
          playVideo(loopBuffer["video"]); //たぶんここ修正要
          modules.textPrint(stx, strCnvs, "LOOP");
        } else {
          modules.erasePrint(ctx, canvas);
          modules.textPrint(ctx, canvas, stringsClient);
        }
      socket.emit('AckFromClient', "CHAT")
      /*
      socket.emit('chunkFromClient', {
        audio :"",
        video :"",
        target:"CHAT"
      });*/
      /*
        chatBuffer["audio"] = bufferData;
        chatBuffer["video"] = funcToBase64(buffer, video);
        chatBuffer["target"] = "CHAT";
        */
    } else if(videoMode.option === "metronome" && videoMode.mode === "chat"){
    } else if(videoMode.option != "drone"){
      switch(videoMode.mode){
        case "chat":
          chatBuffer["audio"] = bufferData;
          chatBuffer["video"] = funcToBase64(buffer, video);
          chatBuffer["target"] = "CHAT";
        break;
        case "pastBuff":
          streamBuffer.push({
            "audio": bufferData,
            "video": funcToBase64(buffer, video)
          });
          console.log(streamBuffer.length) //debug
          break;
        case "pastPlay":
          let beforeChunk = {};
          if(streamBuffer.length>0){
            beforeChunk = streamBuffer.shift();
          } else {
            beforeChunk = {"audio": bufferData, "video": funcToBase64(buffer, video)};
          }
            playAudioStream(beforeChunk["audio"],bufferRate,gainVal["SECBEFORE"],false);
            playVideo(beforeChunk["video"]);
             console.log(streamBuffer.length);
            streamBuffer.push({
              "audio": bufferData,
              "video": funcToBase64(buffer, video)
            })
          break;
        case "playback":
          console.log("debug")
          let playChunk = {};
          if(streamBuffer.length>0){
            playChunk = streamBuffer.shift();
            playAudioStream(playChunk.audio,bufferRate,gainVal.PLAYBACK,false);
            playVideo(playChunk.video);
            streamBuffer.push(playChunk)
          }
          break;
      }
    } else { //DRONE
      if(droneBuff != undefined && droneBuff != {} && droneflag){
        if("audio" in droneBuff) {
          playAudioStream(droneBuff["audio"],droneBuff["sampleRate"],1,false);
        }
        //if("video" in playBuff){
        if("video" in droneBuff){
          playVideo(droneBuff["video"]);
        } else {
          modules.erasePrint(ctx, canvas);
          modules.textPrint(ctx, canvas, stringsClient);
        }
        chatBuffer["audio"] = bufferData;
        chatBuffer["video"] = modules.toBase64(buffer, video);
        chatBuffer["target"] = droneBuff.target;
      }
    }
  }
  if(timelapseFlag){
    let bufferData = new Float32Array(bufferSize);
    e.inputBuffer.copyFromChannel(bufferData, 0);
    let sendChunk = {"audio":bufferData, "video": funcToBase64(buffer, video), "target": "TIMELAPSE"};
    //modules.chunkEmit(sendChunk,socket);
    socket.emit('chunkFromClient', sendChunk)
    timelapseFlag = false;
  }
}
const debugPlay = (flo32arr, sampleRate, volume, glitch) => {
  let audio_buf = audioContext.createBuffer(1, bufferSize, sampleRate),
      audio_src = audioContext.createBufferSource();

  let audioData = audio_buf.getChannelData(0);
  for(let i = 0; i < audioData.length; i++){
    audioData[i] = flo32arr[i];
  }
  console.log("debug")
  console.log(flo32arr)

  audio_src.buffer = audio_buf;
  audio_src.connect(masterGain);

  audio_src.start(0);

}
const playAudioStream = (flo32arr, sampleRate, volume, glitch) => {
  //if(!glitch){
    let audio_src = audioContext.createBufferSource();
    let audioData = new Float32Array(bufferSize);
    for(let i = 0; i < audioData.length; i++){
      audioData[i] = flo32arr[i] * volume;
    }
    if(!glitch){
      let audio_buf = audioContext.createBuffer(1, bufferSize, sampleRate)
      audio_buf.copyToChannel(audioData, 0);
      audio_src.buffer = audio_buf;
      audio_src.connect(masterGain);
    } else {
      //console.log("glitch")
      let audio_buf = audioContext.createBuffer(1, bufferSize, convolver.context.sampleRate)
      audio_buf.copyToChannel(audioData, 0);
      // console.log(audio_buf);

      audio_src.buffer = audio_buf;
      convolver.buffer = audio_buf;
      audio_src.connect(convolver);
    }
    //let timeOut = audio_src.buffer.duration * 1000;
    audio_src.start(0);
  //}
}
droneflag = true;
//video record/play ここまで

//let micLevel = 0.5
//

const initialize = () =>{
  modules.erasePrint(stx, strCnvs);
  socket.emit("startFromClient")

  //audioContext
  audioContext = new AudioContext();
  masterGain = audioContext.createGain();
  masterGain.gain.setValueAtTime(gainVal["master"],0)
  masterGain.connect(audioContext.destination);
  // LPF
  lpFilter = audioContext.createBiquadFilter();
  lpFilter.type = "lowpass";
  lpFilter.frequency.setValueAtTime(20000,0);
  // feedback
  feedbackGain = audioContext.createGain();
  feedbackGain.gain.setValueAtTime(0,0);
  filter = audioContext.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(0,0);
  //record/play
  javascriptnode = audioContext.createScriptProcessor(8192, 1, 1);
  // sinewave
  osc = audioContext.createOscillator();
  oscGain = audioContext.createGain();
  osc.connect(oscGain);
  osc.frequency.setValueAtTime(440, 0);
  oscGain.gain.setValueAtTime(0,0);
  oscGain.connect(masterGain);
  osc.start(0);
  bassOsc = audioContext.createOscillator();
  bassGain = audioContext.createGain();
  bassOsc.connect(bassGain);
  bassGain.connect(masterGain);
  bassOsc.frequency.setValueAtTime(20,0)
  bassGain.gain.setValueAtTime(0,0);
  bassOsc.start(0);
  clickOsc = audioContext.createOscillator();
  clickGain = audioContext.createGain();
  clickOsc.connect(clickGain);
  clickGain.connect(masterGain);
  clickOsc.frequency.setValueAtTime(440,0)
  clickGain.gain.setValueAtTime(0,0);
  clickOsc.start(0);
  //whitenoise
  whitenoise = audioContext.createOscillator();
  whitenoiseNode = audioContext.createScriptProcessor(1024);
  noiseGain = audioContext.createGain();
  noiseGain.gain.setValueAtTime(0,0);
  whitenoiseNode.onaudioprocess = (ev) => {
    buf0 = ev.outputBuffer.getChannelData(0);
    buf1 = ev.outputBuffer.getChannelData(1);
    for(let i=0;i<1024;++i) {
      buf0[i] = buf1[i] = (Math.random()-0.5);
    }
  }
  whitenoise.connect(whitenoiseNode);
  whitenoiseNode.connect(noiseGain);
  noiseGain.connect(masterGain);
  whitenoise.start(0);
  // chat
  chatGain = audioContext.createGain();
  chatGain.gain.setValueAtTime(1,0);
  chatGain.connect(masterGain);

  convolver = audioContext.createConvolver();
  revGain = audioContext.createGain();
  revGain.gain.setValueAtTime(1.6,0);
  //console.log(convolver.context.sampleRate);
  convolver.connect(revGain);
  revGain.connect(masterGain);
  convolver.connect(masterGain);
  loadSample(audioContext, "/files/alert.wav");

  //face detect
  video = document.getElementById('video');
  video.width  = 640;
  video.height = 480
  let video_track = null
  video.play();

  if(navigator.mediaDevices.getUserMedia){
    navigator.mediaDevices.getUserMedia({
      video: true, audio: /*true*/{
        "mandatory": {
          "googEchoCancellation": false,
          "googAutoGainControl": false,
          "googNoiseSuppression": false,
          "googHighpassFilter": false
        },
        //"volume": micLevel,
        "optional": []
      } 
    }).then((stream) =>{
      let mediastreamsource = void 0;
      mediastreamsource = audioContext.createMediaStreamSource(stream);
      mediastreamsource.connect(filter);
      filter.connect(lpFilter)
      lpFilter.connect(javascriptnode); //LPF
      filter.connect(feedbackGain);
      feedbackGain.connect(masterGain);

      //face detect
      video_track = stream.getVideoTracks()[0];
      video.srcObject = stream
      video.volume = 0;
      renderStart();
    },  (e) =>{
      return console.log(e);
    });
  } else {
    navigator.getUserMedia({
      video: true, audio: {
        "mandatory": {
          "googEchoCancellation": false,
          "googAutoGainControl": false,
          "googNoiseSuppression": false,
          "googHighpassFilter": false
        },"optional": []
      } 
    }, (stream) =>{
    //}, (stream) =>{
      let mediastreamsource = void 0;
      mediastreamsource = audioContext.createMediaStreamSource(stream);
      mediastreamsource.connect(filter);
      filter.connect(javascriptnode);
      filter.connect(feedbackGain);
      feedbackGain.connect(masterGain);
      //face detect 
      video_track = stream.getVideoTracks()[0];
      video.src = window.URL.createObjectURL(stream);
      video.volume = 0;
      renderStart();
    },  (e) =>{
      return console.log(e);
    });
  }
  //rec
  javascriptnode.onaudioprocess = onAudioProcess;
  // javascriptnode.connect(audioContext.destination);
  javascriptnode.connect(masterGain);
  //video
  image = document.createElement("img");
  receive = document.getElementById("cnvs");
  receive_ctx = receive.getContext("2d");

  let tracking_started = false;
  video.addEventListener('playing', function(){
    if (tracking_started === true) {
        return;
    }
    ctracker.init();
    ctracker.start(video);
    detectLoop()
    //console.log("debug3")

    video.onresize = function() {
        ctracker.stop();
        ctracker.reset();
        ctracker.start(video);
    }

    tracking_started = true;
  });

  const detectLoop = () =>{
    requestAnimationFrame(detectLoop);
    if(ctrackerMode){
      modules.textPrint(stx,strCnvs,"FACE")
      setTimeout(()=>{
        modules.erasePrint(stx, strCnvs);
      },500)
      if(ctracker.getCurrentPosition()){
        //modules.textPrint(stx, strCnvs, "FACE DETECT");
        if(Math.random() < 0.1) {
          ctrackerMode = false
          let cmdArr = ["STOP"]
          for(let cmd in cmdMode){
            if(!cmdMode[cmd] || cmd != "instruction") cmdArr.push(cmd)
          }
          let targetCmd = {"cmd": cmdArr[Math.floor(Math.random() * cmdArr.length)].toUpperCase(), "stopOther":false}
          if(targetCmd.cmd === "SINEWAVE") {
            targetCmd.property = 40 + (Math.random() * 1000)
          }
          doCmd(targetCmd)
          setTimeout(()=>{
            ctrackerMode = true
          },10000)
        } else if(videoMode.mode != "none" && videoMode.mode != "record"){
          ctrackerMode = false
          localSampleRate = 3000 + Math.random() * 93000
          setTimeout(()=>{
            ctrackerMode = true
          },10000)
        } else if (oscGain.gain.value > 0){
          modules.erasePrint(stx, strCnvs);
          modules.erasePrint(ctx, cnvs);
          let freqVal = osc.frequency.value * (0.5 + Math.random())
          modules.textPrint(stx, strCnvs, String(freqVal) + "Hz");
          ctrackerMode = false
          let currentTime = audioContext.currentTime;
          oscPortament = Math.random() * 20
          osc.frequency.setTargetAtTime(freqVal,currentTime,oscPortament);
          setTimeout(()=>{
            ctrackerMode = true
          },10000)
        } else {
          click()
        }
        //console.log(ctracker.getCurrentPosition())
      } else {
    //    modules.erasePrint(stx, strCnvs);
        //console.log(ctracker.getCurrentPosition())
        //console.log("not detect")
      }
    }
  }
};

//metronome
let rhythmProperty = {
  "bpm": 60,
  "interval": 1000,
  "score": [1,1,1,1],
  "timbre": 440
};
let metronome;
let metronomeCount = 0;
const startRhythm = (interval,timbre) =>{
  metronome = setInterval(()=>{
    if(rhythmProperty.score[metronomeCount] === 1){
      //switch(rhythmProperty.timbre){
      //  default:
          //click(rhythmProperty.timbre)
      if(timbre === "CLICK"){
        click()
      } else if(timbre === "STREAM"){
        if("audio" in chatBuffer) {
          playAudioStream(chatBuffer.audio,bufferRate,1,false);
        }
        if("video" in chatBuffer){
          playVideo(chatBuffer["video"]);
          modules.textPrint(stx, strCnvs, "LOOP");
        } else {
          modules.erasePrint(ctx, canvas);
          modules.textPrint(ctx, canvas, stringsClient);
        }
      }
    }
    if(metronomeCount+1 < rhythmProperty.score.length){
      metronomeCount++
    } else {
      metronomeCount = 0
    }
  },interval); 
}

const stopRhythm = () => {
  clearInterval(metronome);
  if(videoMode.option === "metronome") videoMode.option = "none"
}

//keyboard
let stringsClient = "";

const keyDown = (e) => {
  console.log(e.keyCode);
  let charCode = keyMap[e.keyCode]
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

//window.addEventListener("load", initialize, false);
let eListener = document.getElementById("wrapper")
eListener.addEventListener("click", initialize, false);
window.addEventListener('resize', (e) =>{
  console.log('resizing')
  sizing()
})
document.addEventListener('keydown', (e) => {
  console.log(e)
  keyDown(e)
})



// 関数
// canvas

let canvas = document.getElementById('cnvs');
let ctx = canvas.getContext('2d');
let strCnvs = document.getElementById('strCnvs');
let stx = strCnvs.getContext('2d');
let buffer;
let bufferContext;

const sizing=() =>{
  document.getElementById("cnvs").setAttribute("height", String(window.innerHeight) + "px")
  document.getElementById("cnvs").setAttribute("width", String(window.innerWidth) + "px")
  document.getElementById("strCnvs").setAttribute("height", String(window.innerHeight) + "px")
  document.getElementById("strCnvs").setAttribute("width", String(window.innerWidth) + "px")
}

sizing();

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

// socket
socket.emit('connectFromClient', client);
socket.on('connectFromServer', (data) => {
  rhythmProperty = data.rhythm
})
socket.on('stringsFromServer', (data) =>{
  //modules.erasePrint(stx, strCnvs)
  stx.clearRect(0, 0, strCnvs.width, strCnvs.height);
  console.log(data)
  stringsClient = data
  modules.textPrint(stx,strCnvs, stringsClient)
});
socket.on('erasePrintFromServer',() =>{
  //stx.clearRect(0, 0, strCnvs.width, strCnvs.height);
  modules.erasePrint(stx,strCnvs)
  modules.whitePrint(ctx,canvas)
});

socket.on('statusViewFromServer', ()=>{
  let statusText = modules.statusPrint(oscGain.gain.value, freqVal, feedbackGain.gain.value, noiseGain.gain.value, bassFlag);
  strings = "";
  stringsClient = "";
  modules.erasePrint(stx, strCnvs);
  modules.textPrint(stx, strCnvs, statusText);
  setTimeout(()=>{
    modules.erasePrint(stx, strCnvs);
  },500)
});

socket.on('statusFromServer', (data)=>{
  if(videoMode.option === "loop"){
    playsampleRate = Number(data.sampleRate[playTarget])
  } else if(videoMode.mode === "pastPlay") {
    bufferRate = Number(data.sampleRate.SECBEFORE)
  }
})

socket.on('cmdFromServer', (data) => {
  if(standAlone === false){
    //console.log(data);
    if(data.target === undefined || data.target === String(socket.id)){
      doCmd(data);
    } else {
      modules.erasePrint(stx, strCnvs);
      modules.textPrint(stx, strCnvs, data.cmd);
      setTimeout(() =>{
        modules.erasePrint(stx, strCnvs);
      },1000)
    }
  }
});
socket.on('textFromServer', (data) => {
  if(data.alert) {
    const previousStatus = {masterGain: masterGain.gain.value, videoMode: videoMode.mode, videoOption: videoMode.option}
    masterGain.gain.setValueAtTime(0,0)
    videoStop()
    setTimeout(()=>{
      alertPlay()
    },100)
    setTimeout(() => {
      masterGain.gain.setValueAtTime(previousStatus.masterGain,0)
      videoMode.mode = previousStatus.videoMode
      videoMode.option = previousStatus.videoOption
    }, 10000)
  }
  console.log("textFromServer")
  console.log(data.text)
  //modules.erasePrint(stx, strCnvs);
  //modules.textPrint(stx, strCnvs, data.text);
  modules.erasePrint(stx, strCnvs)
  modules.textPrint(stx,strCnvs, data.text)
  speakVoice(data.text)
  stringsClient = "";
});

socket.on('instructionFromServer', (data) => {
  videoStop();
  modules.erasePrint(stx, strCnvs);
  modules.textPrint(stx, strCnvs, data["text"]);
  //alertPlay();
  speakVoice(data)
  cmdMode.instruction = true
  setTimeout(()=>{
    modules.erasePrint(stx, strCnvs);
    cmdMode.instruction = false
  }, data["duration"]);
});

socket.on('streamListFromServer', (data) =>{
  streamList = data;
  console.log(streamList);
});

socket.on('streamReqFromServer', (data) => {
  console.log(data)
  switch(data){
    case "CHAT":
    case "droneChat":
      //if(chatBuffer!= {}){
      //console.log(chatBuffer)
      if(chatBuffer!= {} && videoMode.option != "loop") socket.emit('chunkFromClient', chatBuffer);
      /*} else {
        socket.emit('chunkFromClient', {
          "audio" : "",
          "video" : "",
          "target": "CHAT"
        });
      }*/
    break;
  }
});

socket.on('oscFromServer',(data) => {
  let uint8arr = osc.toBuffer(data);
});
socket.on('chunkFromServer', (data) => {
  console.log(Object.keys(data))
  //if(videoMode.mode === "chat"){
  if(videoMode.mode != "record" && videoMode.option != "loop"){
  //if(videoMode.mode != "record" && videoMode.option != "loop"){
    //console.log(videoMode.option)
    if(videoMode.mode != "chat" && data.target === "CHAT" && videoMode.mode != "wait") videoMode.mode = "chat"
    
    if(videoMode.mode != "wait"){
      //if(data.target === "DRONECHAT" && videoMode.mode === "droneChat"){
      if(videoMode.option === "drone"){
        droneBuff = data;
        //socket.emit('wavReqFromClient', data["target"]);
        //console.log("wavReq");
        //socket.emit('chunkFromClient', chatBuffer);
      } else {
        playTarget = data.target
        if(data["audio"] != undefined && data["audio"] != "") {
          let chunkGain = 0.7;
          if(data["target"] in gainVal){
            chunkGain = gainVal[data["target"]];
          }
          //let playsampleRate = 48000
          //console.log(data.audio)
          if(data.sampleRate != undefined){
          if(localSampleRate === 0) {
            playsampleRate = Number(data.sampleRate)
          } else {
            playsampleRate = localSampleRate
          }
          }
            //let playsampleRate = Number(data.sampleRate)
          //}
          //console.log(playsampleRate);
          //playAudioStream(data["audio"],Number(data["sampleRate"]),chunkGain,data["glitch"]);
          //console.log(playsampleRate)
          if(data.target === "INTERNET"){
            debugPlay(data["audio"],playsampleRate,chunkGain,data["glitch"]);
          }else {
            console.log("debug audio")
            playAudioStream(data["audio"],playsampleRate,chunkGain,data["glitch"]);
          }
          //if(data.glitch) playGlitchedURL(data.video);
        }
        if(data["video"] != undefined && data["video"] != "") {
            console.log("debug video")
           playVideo(data.video, data.source);
        } else if(data.target != "CHAT"){
          modules.erasePrint(stx, strCnvs);
          modules.textPrint(stx, strCnvs, data["target"]);
        } else {
          modules.erasePrint(stx, strCnvs);
        }
      }
    }
  }
  if(data["target"] === "CHAT"){
    socket.emit('AckFromClient', "CHAT");
  } else {
    socket.emit('wavReqFromClient', data["target"]);
  }
});

const speakVoice = (data) =>{
  if(voice && data != "VOICE" && data != undefined){
    ssu.text = data;
    speechSynthesis.speak(ssu);
  }
}

const doCmd = (cmd) => {
  //console.log("do cmd" + cmd["cmd"]);
  let currentTime = audioContext.currentTime;
  switch(cmd["cmd"]){
    case "WHITENOISE":
    case "NOISE":
//      stop();
      if(cmd.overlay === undefined || cmd.stopOther){
        oscGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01);
        cmdMode.sinewave = false
        feedbackGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01)
        cmdMode.feedback = false
      }
      //bassGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01)
      //bassFlag = false;
      if(cmdMode.whitenoise){
      //if(noiseGain.gain.value > 0){
        cmdMode.whitenoise = false
        //mode = "none";
        noiseGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01);
        //modules.textPrint(stx, strCnvs, "");
        modules.erasePrint(stx, strCnvs)
      } else {
        cmdMode.whitenoise = true
        //mode = "whitenoise";
        noiseGain.gain.setTargetAtTime(gainVal.NOISE,currentTime,fadeVal.IN + 0.01);
        modules.erasePrint(stx, strCnvs);
        modules.erasePrint(ctx, cnvs);
        modules.textPrint(stx, strCnvs, "WHITENOISE");
      }
      speakVoice("NOISE")
      break;
    case "CLICK":
      modules.erasePrint(ctx, cnvs);
      click();
      speakVoice(cmd.cmd)
      break;
    case "BASS":
      modules.erasePrint(ctx, cnvs);
      if(cmd.property) {
        bass(cmd.property);
      } else {
        bass("LOW");
      }
      break;
    case "SINEWAVE":
      //oscGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01);
      if(cmd.overlay === undefined || cmd.stopOther){
        feedbackGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01)
        cmdMode.feedback = false
        noiseGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01)
        cmdMode.whitenoise = false
      }
      //bassGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01)
      //bassFlag = false;
      modules.erasePrint(ctx, cnvs);
      modules.erasePrint(stx, strCnvs);
      if(cmdMode.sinewave && freqVal === cmd["property"]) {
        cmdMode.sinewave = false
        oscGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01);
      } else {
        cmdMode.sinewave = true
        chordChange = 0;
        modules.textPrint(stx, strCnvs, String(cmd["property"]) + "Hz");
        if(freqVal != cmd.property){
          freqVal = cmd.property
          osc.frequency.setTargetAtTime(freqVal,currentTime,oscPortament + 0.01);
        }
        oscGain.gain.setTargetAtTime(gainVal.OSC,currentTime,fadeVal.IN + 0.01);
      }
        setTimeout(()=>{
          console.log(oscGain.gain)
          console.log(osc.frequency)
          console.log(freqVal)
        },500)
      speakVoice(String(cmd["property"]) + " Hz")
      break;
    case "SINEWAVE_UP":
//      osc.frequency.value = osc.frequency.value + cmd["property"];
      freqVal = osc.frequency.value + cmd["property"];
      if(oscPortament === 0){
        osc.frequency.setTargetAtTime(freqVal,currentTime,0.01);
      } else {
        osc.frequency.setTargetAtTime(freqVal,currentTime,oscPortament);
      }
      modules.erasePrint(stx, strCnvs);
      modules.erasePrint(ctx, cnvs);
      //mode = "sinewave";
      cmdMode.sinewave = true
      chordChange = 0;
      modules.textPrint(stx, strCnvs, String(freqVal) + "Hz");
      oscGain.gain.setTargetAtTime(gainVal.OSC,currentTime,fadeVal.IN + 0.01);
      speakVoice(String(cmd.property)+ "Hz UP")
      break;
    case "SINEWAVE_DOWN":
      modules.erasePrint(stx, strCnvs);
      modules.erasePrint(ctx, cnvs);
      freqVal = osc.frequency.value - cmd["property"];
      if(freqVal >= 0){
        if(oscPortament === 0){
          osc.frequency.setTargetAtTime(freqVal,currentTime,0.01);
        } else {
          osc.frequency.setTargetAtTime(freqVal,currentTime,oscPortament);
        }
        //mode = "sinewave";
        cmdMode.sinewave = true
        chordChange = 0;
        modules.textPrint(stx, strCnvs, String(freqVal) + "Hz");
        oscGain.gain.setTargetAtTime(gainVal.OSC,currentTime,fadeVal.IN + 0.01);
      }
      speakVoice(String(cmd.property)+ "Hz DOWN")
      break;
    case "TWICE":
      console.log("debug" + cmd.cmd)
      console.log(cmd.cmd)
      modules.erasePrint(stx, strCnvs);
      modules.erasePrint(ctx, cnvs);
      freqVal = osc.frequency.value * 2
      if(oscPortament === 0){
        osc.frequency.setTargetAtTime(freqVal,currentTime,0.01);
      } else {
        osc.frequency.setTargetAtTime(freqVal,currentTime,oscPortament);
      }
      cmdMode.sinewave = true
      chordChange = 0;
      modules.textPrint(stx, strCnvs, String(freqVal) + "Hz");
      oscGain.gain.setTargetAtTime(gainVal.OSC,currentTime,fadeVal.IN + 0.01);
      speakVoice(String(osc.frequency.value)+ "Hz DOWN")
      break;
    case "THRICE":
      console.log("debug" + cmd.cmd)
      console.log(cmd.cmd)
      modules.erasePrint(stx, strCnvs);
      modules.erasePrint(ctx, cnvs);
      freqVal = osc.frequency.value * 3
      if(oscPortament === 0){
        osc.frequency.setTargetAtTime(freqVal,currentTime,0.01);
      } else {
        osc.frequency.setTargetAtTime(freqVal,currentTime,oscPortament);
      }
      cmdMode.sinewave = true
      chordChange = 0;
      modules.textPrint(stx, strCnvs, String(freqVal) + "Hz");
      oscGain.gain.setTargetAtTime(gainVal.OSC,currentTime,fadeVal.IN + 0.01);
      speakVoice(String(osc.frequency.value)+ "Hz DOWN")
      break;
    case "HALF":
      modules.erasePrint(stx, strCnvs);
      modules.erasePrint(ctx, cnvs);
      freqVal = osc.frequency.value / 2
      if(oscPortament === 0){
        osc.frequency.setTargetAtTime(freqVal,currentTime,0.01);
      } else {
        osc.frequency.setTargetAtTime(freqVal,currentTime,oscPortament);
      }
      cmdMode.sinewave = true
      chordChange = 0;
      modules.textPrint(stx, strCnvs, String(freqVal) + "Hz");
      oscGain.gain.setTargetAtTime(gainVal.OSC,currentTime,fadeVal.IN + 0.01);
      speakVoice(String(osc.frequency.value)+ "Hz DOWN")
      break;
    case "PORTAMENT":
      modules.erasePrint(stx, strCnvs);
      modules.erasePrint(ctx, cnvs);
      modules.textPrint(stx, strCnvs, "PORTAMENT: " + String(cmd["property"]) + "SEC");
      oscPortament = cmd["property"];
      break;
    case "FEEDBACK":
    case "FEED":
      if(cmd.overlay === undefined || cmd.stopOther){
        oscGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01);
        cmdMode.sinewave = false
        //feedbackGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01)
        noiseGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01)
        cmdMode.whitenoise = false
      }
      //bassGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01)
      //bassFlag = false;
      //if(feedbackGain.gain.value > 0) {
      if(cmdMode.feedback) {
        cmdMode.feedback = false
        feedbackGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01);
        modules.erasePrint(stx, strCnvs);
      } else {
        cmdMode.feedback = true
        // console.log("feedback")
        feedbackGain.gain.setTargetAtTime(gainVal.FEEDBACK,currentTime,fadeVal.IN + 0.01);
        modules.erasePrint(stx, strCnvs);
        modules.erasePrint(ctx, cnvs);
        modules.textPrint(stx, strCnvs, "FEEDBACK");
      }
      speakVoice(cmd.cmd)
      break;
    case "FILTER":
      let printText = filterChange();
      modules.erasePrint(stx, strCnvs);
      modules.erasePrint(ctx, cnvs);
      modules.textPrint(stx, strCnvs, "FILTER: " + String(printText) + "Hz");
      setTimeout(() => {
        modules.erasePrint(stx, strCnvs);
//        modules.textPrint(stx, strCnvs, "");
      },800);
      break;
    case "GAIN":
      //console.log("TEST");
      //console.log(cmd.property)
      //console.log(masterGain)
      modules.erasePrint(stx, strCnvs);
      modules.erasePrint(ctx, cnvs);
      modules.textPrint(stx, strCnvs, cmd["property"]["target"] + ": " + String(cmd["property"]["val"]));
      gainVal[cmd["property"]["target"].substr(0,cmd["property"]["target"].length - 4).toUpperCase()] = Number(cmd["property"]["val"]);
      if(eval(cmd["property"]["target"]) != undefined){ //debug later
        if(cmd.property.target != "clickGain" && (cmd.property.target === "masterGain" || eval(cmd.property.target).gain.value > 0)){
          eval(cmd.property.target).gain.setTargetAtTime(Number(cmd.property.val),currentTime,0);
          //eval(cmd["property"]["target"].gain.setTargetAtTime(Number(cmd["property"]["val"],currentTime,0.01)));
        }

        console.log(eval(cmd.property.target).gain.value);
      // } else {
        // streamGain[cmd["property"]["target"].substr(0,cmd["property"]["target"].length - 4).toUpperCase] = Number(cmd["property"]["val"]);
      }
      // console.log(gainVal);
      if(cmd["property"]["target"] === masterGain){
        masterGain.gain.setTargetAtTime(Number(cmd["property"]["val"]),currentTime,0.01)
      }
      setTimeout(()=>{
        modules.erasePrint(stx, strCnvs);
      }, 500)
      break;
    case "VOLUME":
      if(cmd["property"] === "UP"){
        modules.erasePrint(stx, strCnvs);
        modules.erasePrint(ctx, cnvs);
        if(masterGain.gain.value >= 1){
          modules.textPrint(stx, strCnvs, "VOLUME IS FULL");
          setTimeout(()=>{
            modules.erasePrint(stx, strCnvs);
          }, 500);
        } else {
          masterGain.gain.setTargetAtTime(masterGain.gain.value + 0.1,currentTime,0.01)
          modules.textPrint(stx, strCnvs, "VOLUME " + cmd["property"]);
          setTimeout(()=>{
            modules.erasePrint(stx, strCnvs);
          }, 500);
        }
        console.log("debug")
      } else if(cmd["property"] === "DOWN"){
        modules.erasePrint(stx, strCnvs);
        modules.erasePrint(ctx, cnvs);
        if(masterGain.gain.value === 0){
          modules.textPrint(stx, strCnvs, "MUTED");
          setTimeout(()=>{
            modules.erasePrint(stx, strCnvs);
          }, 500);
        } else {
          masterGain.gain.setTargetAtTime(masterGain.gain.value - 0.1,currentTime,0.01)
          modules.textPrint(stx, strCnvs, "VOLUME " + cmd["property"]);
          setTimeout(()=>{
            modules.erasePrint(stx, strCnvs);
          }, 500);
        }
        console.log("debug")
        micLevel = 0.1 //later
      } else {
        if(isNaN(Number(cmd["property"])) === false && cmd["property"] != ""){
          masterGain.gain.setTargetAtTime(Number(cmd["property"]),currentTime,0.01)
        }
        modules.erasePrint(stx, strCnvs);
        modules.erasePrint(ctx, cnvs);
        modules.textPrint(stx, strCnvs, "VOLUME " + cmd["property"]);
        setTimeout(()=>{
          modules.erasePrint(stx, strCnvs);
        }, 500);
      }
      prevGain = masterGain.gain.value;
      speakVoice(cmd.cmd + " " + String(cmd.property))
      break;
    case "MUTE":
      //if(cmd["property"]){
      if(masterGain.gain.value > 0){
        prevGain = masterGain.gain.value;
        masterGain.gain.setValueAtTime(0,0)
        modules.erasePrint(ctx, cnvs);
        modules.erasePrint(stx, strCnvs);
        modules.textPrint(stx, strCnvs, "MUTE");
        setTimeout(()=>{modules.erasePrint(stx, strCnvs);},500);
      } else {
        masterGain.gain.setValueAtTime(prevGain,0)
        modules.erasePrint(stx, strCnvs);
        modules.textPrint(stx, strCnvs, "UNMUTE");
        setTimeout(()=>{modules.erasePrint(stx, strCnvs);},500);
      }
      speakVoice(cmd.cmd)
      break;
    case "FADE":
      console.log(cmd.property.type)
      console.log(cmd.property.status)
      modules.erasePrint(ctx, cnvs);
      if(cmd.property.type != "val") {
        fadeVal[cmd.property.type] = Number(cmd.property.status[cmd.property.type])
        console.log(fadeVal);
        if(cmd.property.type === "OUT" && fadeVal.OUT > 0){
          stop()
        }
        console.log(fadeVal)
      } else {
        console.log("debug")
        fadeVal.IN = cmd.property.status
        fadeVal.OUT = cmd.property.status
        console.log(fadeVal)
      }
      break;
    case "SWITCH ON":
    case "SWITCH OFF":
      modules.erasePrint(ctx, cnvs);
      modules.erasePrint(stx, strCnvs);
      modules.textPrint(stx, strCnvs, cmd["cmd"]);
      setTimeout(()=>{
        modules.erasePrint(stx, strCnvs);
      }, 1500);
      speakVoice(cmd.cmd)
      break;
    case "RECORD":
    case "REC":
      console.log("REC");
      videoStop();
      let prevVidMode = videoMode.mode
      videoMode.mode = "record";
      if(cmd.property != undefined) videoMode.option = cmd.property
        modules.erasePrint(ctx, cnvs);
      modules.erasePrint(stx, strCnvs);
      modules.textPrint(stx, strCnvs, "RECORD");
      setTimeout(() => {
        if(videoMode.mode === "record"){
          //videoMode.mode = "none";
          videoMode.mode = prevVidMode
          videoMode.option = "none"
          modules.erasePrint(stx, strCnvs);
        }
      }, 5000); //時間は考え中
      speakVoice(cmd.cmd)
      break;
    case "SHUTTER":
      if(cmd["property"] === "oneshot"){
        timelapseFlag = true;
      } else if(cmd["property"] === "timelapse"){
        timeLapse();
      } else if(cmd["property"] === "stoplapse"){
        stopLapse();
      }
      //speakVoice(cmd.cmd)
      break;
    case "SECBEFORE":
      streamBuffer = [];
        modules.erasePrint(ctx, cnvs);
      modules.erasePrint(stx, strCnvs);
      modules.textPrint(stx, strCnvs, String(cmd["property"]) + "SEC BEFORE");
      videoMode.mode = "pastBuff";
      if(cmd["rate"] != undefined){
        bufferRate = cmd["rate"];
      } else {
        bufferRate = 48000;
      }
      setTimeout(()=>{
        modules.erasePrint(stx, strCnvs);
        modules.erasePrint(ctx, cnvs);
        videoMode.mode = "pastPlay";
      },cmd["property"] * 1000);
      speakVoice(String(cmd.property) + "SECOND BEFORE")
      break;
    case "DRONE":
      if(cmd.property){
      //if(videoMode.option != "drone"){
        videoMode.option = "drone"
        modules.erasePrint(stx, strCnvs);
        modules.erasePrint(ctx, cnvs);
        modules.textPrint(stx, strCnvs, cmd["cmd"]);
        setTimeout(()=>{
          modules.erasePrint(stx, strCnvs);
        },500)
      } else {
        videoMode.option = "none"
        modules.erasePrint(stx, strCnvs);
        modules.textPrint(stx, strCnvs, "UNDRONE");
        setTimeout(()=>{
          modules.erasePrint(stx, strCnvs);
        },500)
        speakVoice("NOT " + String(cmd.cmd))
      }
      break;
    case "LOOP":
      if(videoMode.mode === "chat"){
        if(videoMode.option != "loop" && videoMode.option != "drone"){
          //if(cmd.property === 0){
            videoMode.option = "loop"
          //if(chatBuffer.audio != undefined && chatBuffer.video != undefined){
          //  loopBuffer = chatBuffer
          //}
        } else if(videoMode.option === "loop"){
          videoMode.option = "none"
          console.log(chatBuffer.target)
          console.log(playTarget)
          //loopBuffer = {}
          //if(chatBuffer["target"] === "CHAT"){
          if(playTarget === "CHAT"){
            socket.emit('AckFromClient', "CHAT");
          } else {
            socket.emit('wavReqFromClient', playTarget);
          }
          modules.erasePrint(stx, strCnvs);
          modules.textPrint(stx, strCnvs, "UNLOOP");
          setTimeout(()=>{
            modules.erasePrint(stx, strCnvs);
          },500)
        } else if(videoMode.option === "metronome"){
          stopRhythm()
          videoMode.option = "none"
          if(playTarget === "CHAT"){
            socket.emit('AckFromClient', "CHAT");
          } else {
            socket.emit('wavReqFromClient', playTarget);
          }
        }
      }
      break;
    case "METRONOME":
      console.log(videoMode.mode)
      //console.log(cmd.property);
      //if(cmd.type === "param") {
      if(cmd.property === "STOP"){
        stopRhythm();
        //speakVoice(cmd.cmd + " STOP")
      } else {
        //console.log(metronome)
        rhythmProperty = cmd.property;
        //if(videoMode.mode != "chat"){
          modules.erasePrint(stx, strCnvs);
          modules.erasePrint(ctx, cnvs);
          modules.textPrint(stx, strCnvs, "BPM:" + String(Math.floor(cmd.property.bpm * 10)/10))
          //console.log(rhythmProperty);
          if(cmd.trig){
            stopRhythm();
            setTimeout(()=>{
              modules.erasePrint(stx, strCnvs);
              modules.erasePrint(ctx, cnvs);
              startRhythm(rhythmProperty.interval,"CLICK");
            },rhythmProperty.interval)
          }
      }
      break;
    case "RATE":
    case "SAMPLERATE":
      bufferRate = cmd.property
      modules.erasePrint(ctx, cnvs);
      modules.erasePrint(stx, strCnvs);
      modules.textPrint(stx, strCnvs, "SAMPLERATE: " + String(cmd.property) + "Hz")
      setTimeout(() => {
        modules.erasePrint(stx, strCnvs)
      }, 500)
      break;
    case "GLITCH":
      modules.erasePrint(stx, strCnvs);
      modules.erasePrint(ctx, cnvs);
      modules.textPrint(stx,strCnvs,cmd.property);
      setTimeout(()=>{
        modules.erasePrint(stx, strCnvs);
      },1000)
      speakVoice(cmd.cmd)
      break;
    case "BROWSER":
      window.open('https://instagram.com', '_blank', 'width=800,height=600');
      speakVoice(cmd.cmd)
    case "PREV":
      pastPresent(cmd["property"]);
      break;
    case "STOP":
      stop()
      videoStop()
      modules.textPrint(stx, strCnvs, "STOP")
      modules.erasePrint(ctx, cnvs);
      setTimeout(()=>{
        modules.erasePrint(stx, strCnvs)
        modules.whitePrint(ctx, canvas)
      }, 500);
      //speakVoice(cmd.cmd)
      break;
    case "NUMBER":
      modules.erasePrint(stx, strCnvs);
      modules.erasePrint(ctx, cnvs);
      modules.textPrint(stx, strCnvs, cmd["property"]);
      setTimeout(()=>{
        modules.erasePrint(stx, strCnvs);
      }, 1000);
      break;
    case "CTRL":
      console.log(cmd["property"]);
      const wrapperId = document.getElementById("wrapper")
      if(document.getElementById("ctrl") != undefined){
        wrapperId.removeChild(wrapperId.firstChild)
        //console.log("remove")
      } else {
        const ctrlId = document.createElement("div")
        ctrlId.setAttribute("id", "ctrl")
        ctrlId.innerHTML = modules.ctrlView(cmd.property)
        console.log(modules.ctrlView(cmd.property))
        wrapperId.insertBefore(ctrlId, wrapperId.firstChild)
        //document.getElementsByClassName("range").forEach(element, index, array){
        //  console.log(index)
        //  e.addEventListener("change", rangeChange)
        //})
        const rangeClass = document.getElementsByClassName("range")
        for(let i=0;i<rangeClass.length;i++){
          rangeClass[i].addEventListener("change", rangeChange)
          rangeClass[i].eventParam = rangeClass[i]
        }
        const routeClass = document.getElementsByClassName("route")
        for(let i=0;i<routeClass.length;i++){
          routeClass[i].addEventListener("change", routeChange)
          routeClass[i].eventParam = routeClass[i]
        }
        const glitchClass = document.getElementsByClassName("glitch")
        for(let i=0;i<glitchClass.length;i++){
          glitchClass[i].addEventListener("change", glitchChange)
          glitchClass[i].eventParam = glitchClass[i]
        }
        //console.log(rangeClass)
        //rangeClass.addEventListener("change", rangeChange, false)
        //console.log("present")
      }
      speakVoice("CONTROL")
      break;
    case "INSTRUCTION":
      videoStop();
      modules.erasePrint(stx, strCnvs);
      modules.erasePrint(ctx, cnvs);
      modules.textPrint(stx, strCnvs, cmd["property"]["text"]);
      if(client != "inside") alertPlay();
      cmdMode.instruction = false
      setTimeout(()=>{
        modules.erasePrint(stx, strCnvs);
        cmdMode.instruction = false
      }, cmd["property"]["duration"]);
      speakVoice(cmd.property.text)
      break;
    case "FACEDETECT":
      modules.erasePrint(stx, strCnvs);
      modules.erasePrint(ctx, cnvs);
      if(cmd.property){
        modules.textPrint(stx, strCnvs, "FACE DETECT");
      } else {
        modules.textPrint(stx, strCnvs, "NOT FACE DETECT");
      }
      setTimeout(()=>{
        modules.erasePrint(stx, strCnvs);
      }, 500);
      ctrackerMode = cmd.property
      speakVoice("FACE DETECT")
      break;
    case "TILE":
      tileFlag = cmd.property
    default:
      for(let key in streamList){
        if(key === cmd["cmd"]){
          console.log(cmd["cmd"]);
          videoMode.mode = "chat";
          videoMode.option = "none";
          modules.erasePrint(stx, strCnvs);
          modules.erasePrint(ctx, cnvs);
          modules.textPrint(stx, strCnvs, cmd["cmd"]);
          setTimeout(()=> {
            modules.erasePrint(stx, strCnvs);
          },800);
        }
      }
      if(cmd.cmd != "KICK" && cmd.cmd != "SNARE" && cmd.cmd != "HAT") speakVoice(cmd.cmd)
      break;

  }
  strings = "";
  stringsClient = "";
}

const stop = () => {
  let currentTime = audioContext.currentTime
  oscGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01);
  feedbackGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01)
  noiseGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01)
  bassGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01)
  //munouGain.gain.value = 0;
  bassFlag = false;
  modules.whitePrint(ctx, canvas);
  modules.erasePrint(stx, strCnvs);
  modules.erasePrint(ctx, canvas);
//  modules.textPrint(stx, strCnvs, "");
  cmdMode = {
    "sinewave": false,
    "whitenoise": false,
    "feedback": false,
    "instruction": false
  }
  //modules.textPrint(stx, strCnvs, "STOP");
  stopRhythm();
}

const videoStop = () => {
  switch (videoMode.mode) {
    case "chunkEmit":
      break;
    case "beforePlay":
    case "beforeBuff":
    default:
      videoMode.mode = "none";
      break;
  }
  videoMode.option = "none"
}


const pastPresent = (status) =>{
  // console.log(status);
  for(let key in status){
    if(key === "SINEWAVE" && status[key]){
      doCmd({"cmd":key, "property": Number(status[key])});
    } else if(key === "SECBEFORE" && status[key]){
      videoMode.mode = "pastPlay";
    } else if(status[key]){
      doCmd({"cmd":key});
    }
  }
}

let tileHsh = {}

const playVideo = (video, source) => {
  image = new Image();
  image.src = video;
  //  console.log("image width:" + String(image.width) + ", image height:" + String(image.height))
  //console.log("window width:" + String(window.innerWidth) + ", window height:" + String(window.innerHeight))
  //console.log("width:" + String(wdth) + ",height:" + String(hght))
  /*
  if(image.width > (image.height * 4) / 3) {
    wdth = window.innerWidth
    //const hght = (wdth * 3) / 4
    hght = wdth * (image.height / image.width)
  } else {
    hght = window.innerHeight
    wdth = hght * (image.width / image.height)
  }
  */

  image.onload = function(){
    let wdth
    let hght
    let x = 0
    let y = 0
    console.log("debug videoPlay")
    if(tileFlag && source && source != socket.id){
      if(source in tileHsh) {
      } else {
        let area = Object.keys(tileHsh).length % 4
        let ratio = Math.random()/2 + 0.4
        tileHsh[source] = {
          x: (area % 2) * (window.innerWidth / 2) + Math.floor(Math.random() * (window.innerWidth / 2 - image.width * ratio)),
          y: (Math.floor(area / 2)) * (window.innerHeight / 2) + Math.floor(Math.random() * (window.innerHeight / 2 - image.height * ratio)),
          w: image.width * ratio,
          h: image.height * ratio
        }
      }
      x = tileHsh[source].x
      y = tileHsh[source].y
      wdth = tileHsh[source].w
      hght = tileHsh[source].h
    } else {
      console.log("debug not tile")
        let aspect = image.width / image.height
        console.log(aspect)
        if(aspect > (window.innerWidth / window.innerHeight)) {
          wdth = window.innerWidth
          hght = wdth / aspect
        } else {
          hght = window.innerHeight
          wdth = hght * aspect
        }
    }
  //  console.log("image width:" + String(image.width) + ", image height:" + String(image.height))
  //console.log("window width:" + String(window.innerWidth) + ", window height:" + String(window.innerHeight))
    console.log("width:" + String(wdth) + ",height:" + String(hght) + ", x:"+ x + ", y:"+ y)
    receive_ctx.drawImage(image, x, y, wdth, hght);
  }
}

const lapseInterval = 120000;
let setLapse;

const timeLapse = ()=>{
  setLapse = setInterval(() => {
      timelapseFlag = true;
  }, lapseInterval);
}

const stopLapse = ()=>{
  clearInterval(setLapse);
}


//ctrlView ctrl
const rangeChange = (e)=>{
  //const e = {"id":"dummy"}
  console.log(e.target.eventParam)
  console.log("range change")
  let ctrlCmd;
  let ctrlProperty;
  if(e.target.eventParam.id === "CHATRATE"){ //CHATRATE
    console.log("chatrate")
    ctrlCmd = "CHATRATE"
    ctrlProperty ={
      "target": e.target.eventParam.name,
      "val" : e.target.eventParam.value
    };
    document.getElementById("CHATRATELabel").innerText = String(ctrlProperty.val)
  } else if(e.target.eventParam.id.match(/^LATENCY/) || e.target.eventParam.id.match(/^RATE/) ) { //LATENCY or RATE
    console.log("LATENCY or RATE")
    let val = e.target.eventParam.value
    const targetArr = e.target.eventParam.id.split("_");
    if(targetArr[0] === "LATENCY") val = val * 1000
    ctrlCmd = targetArr[0];
    ctrlProperty = {
      "target": e.target.eventParam.name,
      "streamType": targetArr[1],
      "val": val
    }
    document.getElementById(targetArr[0] + 'Label').innerText = String(val)
    setTimeout(()=>{
      document.getElementById(targetArr[0] + 'Label').innerText = String(targetArr[0])
      //$('#' + targetArr[0] + 'Label').text(targetArr[0]);
    },2000);
  } else {
    console.log("etc")
    ctrlCmd = e.target.eventParam.name
    ctrlProperty = {
      "target" : e.target.eventParam.id,
      "val" : e.target.eventParam.value
    }
    const test = document.getElementById(e.target.eventParam.name + ctrlProperty.target + 'Label')
    console.log(test)
    test.innerText = String(ctrlProperty.val)
  }
  console.log(ctrlCmd);
  console.log(ctrlProperty);
  socket.emit('cmdFromCtrl',{
    "cmd": ctrlCmd,
    "property": ctrlProperty
  });
}
const routeChange = (e) =>{
  console.log(e.target.eventParam)
  let property = {
    "target" : e.target.eventParam.name,
    "stream" : e.target.eventParam.id.split("_")[0],
    "val" : e.target.eventParam.checked
  };
  socket.emit('cmdFromCtrl',{
    "cmd": e.target.eventParam.id.split("_")[1],
    "property": property
  });
}
const glitchChange = (e) =>{
  let property = {
    "stream" : e.target.eventParam.id,
    "val" : e.target.eventParam.checked
  };
  socket.emit('cmdFromCtrl',{
    "cmd": "GLITCH",
    "property": property
  });
}
const funcToBase64 = () =>{
  //console.log(buffer);
  let bufferContext = buffer.getContext('2d');
  buffer.width = video.videoWidth;
  buffer.height = video.videoHeight;
  bufferContext.drawImage(video, 0, 0);
  //return buffer.toDataURL("image/webp");
  return buffer.toDataURL("image/jpeg");
}

const keyMap = {
// const keycodeMap = {
'48' : '0',
'49' : '1',
'50' : '2',
'51' : '3',
'52' : '4',
'53' : '5',
'54' : '6',
'55' : '7',
'56' : '8',
'57' : '9',
'65' : 'A',
'66' : 'B',
'67' : 'C',
'68' : 'D',
'69' : 'E',
'70' : 'F',
'71' : 'G',
'72' : 'H',
'73' : 'I',
'74' : 'J',
'75' : 'K',
'76' : 'L',
'77' : 'M',
'78' : 'N',
'79' : 'O',
'80' : 'P',
'81' : 'Q',
'82' : 'R',
'83' : 'S',
'84' : 'T',
'85' : 'U',
'86' : 'V',
'87' : 'W',
'88' : 'X',
'89' : 'Y',
'90' : 'Z',
'8'  : 'backspace',
'13' : 'enter',
'16' : 'shift',
'17' : 'ctrl',
'36' : 'home',
'18' : 'alt',
'9' : 'tab',
'32' : ' ',
'107' : 'add',
'20' : 'caps_lock',
'27' : 'escape',
'37' : 'left_arrow',
'38' : 'up_arrow',
'39' : 'right_arrow',
'40' : 'down_arrow',
'112' : 'f1' ,
'113' : 'f2' ,
'114' : 'f3' ,
'115' : 'f4' ,
'116' : 'f5' ,
'117' : 'f6' ,
'118' : 'f7' ,
'119' : 'f8' ,
'120' : 'f9' ,
'121' : 'f10',
'122' : 'f11',
'123' : 'f12',
'188' : ',',
"190" : ".",
"189" : "_",
"226" : "_",
"220" : "_"
};

modules.textPrint(stx, strCnvs, "click screen")
