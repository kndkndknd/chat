const modules = require('./module.js');
console.log(socket)

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;

let audioContext = new AudioContext();
let masterGain = audioContext.createGain();

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


masterGain.gain.setValueAtTime(gainVal["master"],0)
//masterGain.gain.setTargetAtTime(gainVal["master"],0,0)
let prevGain = 0.7;
masterGain.connect(audioContext.destination);

// feedback
let feedbackGain = audioContext.createGain();
feedbackGain.gain.setValueAtTime(0,0);
let filter = audioContext.createBiquadFilter();
filter.type = "highpass";
filter.frequency.setValueAtTime(200,0);
//record/play
let javascriptnode = audioContext.createScriptProcessor(8192, 1, 1);
let streamBuffer = [];
let lookBackBuffer = [];
let bufferSize = 8192;
let bufferRate = 44100;
// sinewave
let osc = audioContext.createOscillator();
let oscGain = audioContext.createGain();
let oscPortament = 0;
osc.connect(oscGain);
//oscGain.connect(audioContext.destination);
osc.frequency.setValueAtTime(440, 0);
oscGain.gain.setValueAtTime(0,0);
oscGain.connect(masterGain);
//osc.frequency.setTargetAtTime(440,audioContext.currentTime,audioContext.currentTime);
//oscGain.gain.setTargetAtTime(0,audioContext.currentTime,audioContext.currentTime);
//osc.frequency.setValueAtTime(440,audioContext.currentTime);
//oscGain.gain.setValueAtTime(0,audioContext.currentTime);
osc.start(0);
let bassOsc = audioContext.createOscillator();
let bassGain = audioContext.createGain();
bassOsc.connect(bassGain);
bassGain.connect(masterGain);
bassOsc.frequency.setValueAtTime(20,0)
bassGain.gain.setValueAtTime(0,0);
bassOsc.start(0);

let clickOsc = audioContext.createOscillator();
let clickGain = audioContext.createGain();
clickOsc.connect(clickGain);
clickGain.connect(masterGain);
clickOsc.frequency.setValueAtTime(440,0)
clickGain.gain.setValueAtTime(0,0);
clickOsc.start(0);

//whitenoise
let whitenoise = audioContext.createOscillator();
let whitenoiseNode = audioContext.createScriptProcessor(1024);
let noiseGain = audioContext.createGain();
noiseGain.gain.setValueAtTime(0,0);
whitenoiseNode.onaudioprocess = (ev) => {
  let buf0 = ev.outputBuffer.getChannelData(0);
  let buf1 = ev.outputBuffer.getChannelData(1);
  for(let i=0;i<1024;++i) {
    buf0[i] = buf1[i] = (Math.random()-0.5);
  }
}
whitenoise.connect(whitenoiseNode);
whitenoiseNode.connect(noiseGain);
noiseGain.connect(masterGain);
//whitenoiseNode.connect(audioContext.destination);
whitenoise.start(0);

//munou no unmei
/*
let munouOsc = audioContext.createOscillator();
let munouGain = audioContext.createGain();
munouOsc.connect(munouGain);
//oscGain.connect(audioContext.destination);
munouGain.connect(masterGain);
munouOsc.frequency.value = 110;
munouGain.gain.value = 0;
munouOsc.start(0);
*/
// chat
let chatBuffer = {};
let chatGain = audioContext.createGain();
chatGain.gain.setValueAtTime(1,0);
chatGain.connect(masterGain);

let convolver = audioContext.createConvolver();
//convolver.context.sampleRate = 44100;
let revGain = audioContext.createGain();
revGain.gain.setValueAtTime(1.6,0);
console.log(convolver.context.sampleRate);
convolver.connect(revGain);
revGain.connect(masterGain);
convolver.connect(masterGain);
let droneBuff = {};
/*let streamGain = {
"CHAT": 1,
"PLAYBACK": 0.7,
"TIMELAPSE": 0.7,
"DRUM": 0.7,
"SECBEFORE": 0.7,
"SILENCE": 0
};*/
let timelapseFlag = false;

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
loadSample(audioContext, "/files/alert.wav");

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

const filterChange = () => {
  let returnValue = 0;
  let currentTime = audioContext.currentTime
  switch(filter.frequency.value){
    case 200:
      returnValue = 2000;
      break;
    case 2000:
      returnValue = 8000;
      break;
    case 8000:
      returnValue = 14000;
      break;
    case 14000:
      returnValue = 0;
      break;
    default:
      returnValue = 200;
      break;
  }
  filter.frequency.setTargetAtTime(returnValue,currentTime,0)
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
const playAudioStream = (flo32arr, sampleRate, volume, glitch) => {
  //if(!glitch){
    let audio_src = audioContext.createBufferSource();
    let audioData = new Float32Array(bufferSize);
    for(let i = 0; i < audioData.length; i++){
      audioData[i] = flo32arr[i] * volume;
    }
    if(!glitch){
      //console.log(sampleRate)
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
    /*
    droneflag = false
    setTimeout(()=>{
      droneflag = true
    },timeOut);*/
  //}
}
droneflag = true;
//video record/play ここまで

//let micLevel = 0.5

const initialize = () =>{
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
    //}, (stream) =>{
      let mediastreamsource = void 0;
      mediastreamsource = audioContext.createMediaStreamSource(stream);
      mediastreamsource.connect(filter);
      filter.connect(javascriptnode);
      filter.connect(feedbackGain);
      //      selfGain.connect(analyser);
  //    feedbackGain.connect(audioContext.destination);
      feedbackGain.connect(masterGain);
      //video
      video = document.getElementById('video');
      //video.src = window.URL.createObjectURL(stream);
      //video.src = window.URL.createObjectURL(stream);
      //video.srcObject = stream
      if(video.srcObject != undefined){
        video.srcObject = stream
      } else {
        video.src = window.URL.createObjectURL(stream);
      }
      video.play();
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
      //      selfGain.connect(analyser);
  //    feedbackGain.connect(audioContext.destination);
      feedbackGain.connect(masterGain);
      //video
      video = document.getElementById('video');
      video.src = window.URL.createObjectURL(stream);
      /*
      if(video.srcObject != undefined){
        video.srcObject = stream
      } else {
        video.src = window.URL.createObjectURL(stream);
      }*/
      video.play();
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
          /*
          clickOsc.frequency.value = rhythmProperty.timbre
          clickGain.gain.setValueAtTime(gainVal["CLICK"], t0);
          clickGain.gain.setTargetAtTime(0,t0,0.03);
          */
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

/*
$(() =>{
  $(document).on("keydown", (e)=> {
  */
const keyDown = (e) => {
  console.log(e.keyCode);
  let charCode = keyMap[e.keyCode]
  if(!standAlone) {
    if(charCode === "enter" && (stringsClient === "LOCAL" || stringsClient === "STANDALONE")){
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
  } else {
    if(charCode === "enter"){
      if(stringsClient === "NETWORK" || stringsClient === "CONNECT"){
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

window.addEventListener("load", initialize, false);
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

/*
$(() => {
//  draw();
  $(window).resize(() =>{
    sizing();
  });
});
*/
const sizing=() =>{
  document.getElementById("cnvs").setAttribute("height", String(window.innerHeight) + "px")
  document.getElementById("cnvs").setAttribute("width", String(window.innerWidth) + "px")
  document.getElementById("strCnvs").setAttribute("height", String(window.innerHeight) + "px")
  document.getElementById("strCnvs").setAttribute("width", String(window.innerWidth) + "px")
  /*
  $("#cnvs").attr({ height: $(window).height() });
  $("#cnvs").attr({ width: $(window).width() });
  $("#strCnvs").attr({ height: $(window).height() });
  $("#strCnvs").attr({ width: $(window).width() });
  */
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

/* socket */
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
    alertPlay()
    /*
    if(videoMode.mode === "chat"){
      videoMode.mode = "wait"
      console.log(videoMode.mode)
      setTimeout(()=>{
        //modules.erasePrint(stx, strCnvs);
        //modules.textPrint(stx, strCnvs, data.text);
        modules.erasePrint(stx, strCnvs)
        modules.textPrint(stx,strCnvs, data.text)
      },500)
      setTimeout(()=>{
        console.log(videoMode.mode)
        videoMode.mode = "none"
        console.log(videoMode.mode)
      },5000)
    }*/
  }
  console.log("textFromServer")
  console.log(data.text)
  //modules.erasePrint(stx, strCnvs);
  //modules.textPrint(stx, strCnvs, data.text);
  modules.erasePrint(stx, strCnvs)
  modules.textPrint(stx,strCnvs, data.text)
  speakVoice(data.text)
  /*
  setTimeout(()=>{
    modules.erasePrint(stx, strCnvs);
  },800)*/
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
  switch(data){
    case "CHAT":
    case "droneChat":
      //if(chatBuffer!= {}){
      //console.log(chatBuffer)
      if(chatBuffer!= {}) socket.emit('chunkFromClient', chatBuffer);
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
/*
const playGlitchedURL = (url) => {
  if(~url.indexOf("data:image/jpeg;base64,")){
    let audioURL = "data:audio/wav;base64," + url.split("data:image/jpeg;base64,")[1].slice(0,-2) + "gAA==";
    console.log(audioURL);
    let buff = Base64Binary.decodeArrayBuffer(audioURL);
    audioContext.decodeAudioData(buff, (audioData)=>{
      let audioSrc = audioContext.createBufferSource()
      audioSrc.buffer = audioData
      audioSrc.connect(masterGain);
      audioSrc.start(0);
    });
  // 再生 たぶんdecodeaudiodataして再生
  }
}
*/
let playsampleRate = 44100
let playTarget = ""
socket.on('chunkFromServer', (data) => {
  //if(videoMode.mode === "chat"){
  if(videoMode.mode != "record" && videoMode.option != "loop"){
  //if(videoMode.mode != "record" && videoMode.option != "loop"){
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
          //let playsampleRate = 44100
          //if(data.sampleRate != undefined) {
            playsampleRate = Number(data.sampleRate)
            //let playsampleRate = Number(data.sampleRate)
          //}
          //console.log(playsampleRate);
          //playAudioStream(data["audio"],Number(data["sampleRate"]),chunkGain,data["glitch"]);
          playAudioStream(data["audio"],playsampleRate,chunkGain,data["glitch"]);
          //if(data.glitch) playGlitchedURL(data.video);
        }
        if(data["video"] != undefined && data["video"] != "") {
           playVideo(data["video"]);
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
  // console.log("do cmd" + cmd["cmd"]);
  let currentTime = audioContext.currentTime;
  switch(cmd["cmd"]){
    case "WHITENOISE":
    case "NOISE":
//      stop();
      oscGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01);
      cmdMode.sinewave = false
      feedbackGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01)
      cmdMode.feedback = false
      bassGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01)
      bassFlag = false;
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
        modules.textPrint(stx, strCnvs, "WHITENOISE");
      }
      speakVoice("NOISE")
      break;
    case "CLICK":
      click();
      speakVoice(cmd.cmd)
      break;
    case "BASS":
      if(cmd.property) {
        bass(cmd.property);
      } else {
        bass("LOW");
      }
      oscGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01);
      cmdMode.sinewave = false
      feedbackGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01)
      cmdMode.feedback = false
      noiseGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01)
      cmdMode.whitenoise = false
      //bassGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01)
      //bassFlag = false;
      //speakVoice(cmd.cmd)
      break;
    case "SINEWAVE":
      //oscGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01);
      feedbackGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01)
      cmdMode.feedback = false
      noiseGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01)
      cmdMode.whitenoise = false
      bassGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01)
      bassFlag = false;
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
      //mode = "sinewave";
      cmdMode.sinewave = true
      chordChange = 0;
      modules.textPrint(stx, strCnvs, String(freqVal) + "Hz");
      oscGain.gain.setTargetAtTime(gainVal.OSC,currentTime,fadeVal.IN + 0.01);
      speakVoice(String(cmd.property)+ "Hz UP")
      break;
    case "SINEWAVE_DOWN":
      modules.erasePrint(stx, strCnvs);
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
      modules.erasePrint(stx, strCnvs);
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
      modules.erasePrint(stx, strCnvs);
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
      modules.textPrint(stx, strCnvs, "PORTAMENT: " + String(cmd["property"]) + "SEC");
      oscPortament = cmd["property"];
      break;
    case "FEEDBACK":
    case "FEED":
      oscGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01);
      cmdMode.sinewave = false
      //feedbackGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01)
      noiseGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01)
      cmdMode.whitenoise = false
      bassGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01)
      bassFlag = false;
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
        modules.textPrint(stx, strCnvs, "FEEDBACK");
      }
      speakVoice(cmd.cmd)
      break;
    case "FILTER":
      let printText = filterChange();
      modules.erasePrint(stx, strCnvs);
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
      modules.erasePrint(stx, strCnvs);
      modules.textPrint(stx, strCnvs, String(cmd["property"]) + "SEC BEFORE");
      videoMode.mode = "pastBuff";
      if(cmd["rate"] != undefined){
        bufferRate = cmd["rate"];
      } else {
        bufferRate = 44100;
      }
      setTimeout(()=>{
        modules.erasePrint(stx, strCnvs);
        videoMode.mode = "pastPlay";
      },cmd["property"] * 1000);
      speakVoice(String(cmd.property) + "SECOND BEFORE")
      break;
    case "DRONE":
      if(cmd.property){
      //if(videoMode.option != "drone"){
        videoMode.option = "drone"
        modules.erasePrint(stx, strCnvs);
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
          /*} else {
            startRhythm(Math.round(60000/cmd.property),"STREAM")
            videoMode.option = "metronome"
          }*/
        } else if(videoMode.option === "loop"){
          videoMode.option = "none"
          console.log(chatBuffer.target)
          console.log(playTarget)
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
          modules.textPrint(stx, strCnvs, "BPM:" + String(Math.floor(cmd.property.bpm * 10)/10))
          //console.log(rhythmProperty);
          if(cmd.trig){
            stopRhythm();
            setTimeout(()=>{
              modules.erasePrint(stx, strCnvs);
              startRhythm(rhythmProperty.interval,"CLICK");
            },rhythmProperty.interval)
          }
        /*} else {
          if(cmd.trig){
            modules.erasePrint(stx, strCnvs);
            stopRhythm();
            startRhythm(rhythmProperty.interval,"STREAM")
            videoMode.option = "metronome"
          }
        }*/
      }
      break;
    case "RATE":
    case "SAMPLERATE":
      bufferRate = cmd.property
      modules.erasePrint(stx, strCnvs);
      modules.textPrint(stx, strCnvs, "SAMPLERATE: " + String(cmd.property) + "Hz")
      setTimeout(() => {
        modules.erasePrint(stx, strCnvs)
      }, 500)
      break;
    case "GLITCH":
      modules.erasePrint(stx, strCnvs);
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
      setTimeout(()=>{
        modules.erasePrint(stx, strCnvs)
        modules.whitePrint(ctx, canvas)
      }, 500);
      //speakVoice(cmd.cmd)
      break;
    case "NUMBER":
      modules.erasePrint(stx, strCnvs);
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
      modules.textPrint(stx, strCnvs, cmd["property"]["text"]);
      if(client != "inside") alertPlay();
      cmdMode.instruction = false
      setTimeout(()=>{
        modules.erasePrint(stx, strCnvs);
        cmdMode.instruction = false
      }, cmd["property"]["duration"]);
      speakVoice(cmd.property.text)
      break;
    default:
      for(let key in streamList){
        if(key === cmd["cmd"]){
          console.log(cmd["cmd"]);
          videoMode.mode = "chat";
          videoMode.option = "none";
          modules.erasePrint(stx, strCnvs);
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

const playVideo = (video) => {
  image = new Image();
  image.src = video;
  const wdth = window.innerWidth
  const hght = (wdth * 3) / 4

  image.onload = function(){
    receive_ctx.drawImage(image, 0, 0, wdth, hght);
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

/*
const emitInterval = 120000;
setInterval(() => {
  // if(videoMode.mode === "none"){
    // console.log("送信");
    timelapseFlag = true;
  // }
}, emitInterval);
*/

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
'188' : 'comma',
"190" : ".",
"189" : "_",
"226" : "_",
"220" : "_"
};
