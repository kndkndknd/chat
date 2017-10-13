const modules = require('./module.js');

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

masterGain.gain.value = gainVal["master"];
let prevGain = 0.7;
masterGain.connect(audioContext.destination);

// feedback
let feedbackGain = audioContext.createGain();
feedbackGain.gain.value = 0;
let filter = audioContext.createBiquadFilter();
filter.type = "highpass";
filter.frequency.value = 200;
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
oscGain.connect(masterGain);
osc.frequency.value = 440;
oscGain.gain.value = 0;
osc.start(0);
let bassOsc = audioContext.createOscillator();
let bassGain = audioContext.createGain();
bassOsc.connect(bassGain);
bassGain.connect(masterGain);
bassOsc.frequency.value = 20;
bassGain.gain.value = 0;
bassOsc.start(0);


let clickOsc = audioContext.createOscillator();
let clickGain = audioContext.createGain();
clickOsc.connect(clickGain);
clickGain.connect(masterGain);
clickOsc.frequency.value = 440;
clickGain.gain.value = 0;
clickOsc.start(0);

//whitenoise
let whitenoise = audioContext.createOscillator();
let whitenoiseNode = audioContext.createScriptProcessor(1024);
let noiseGain = audioContext.createGain();
noiseGain.gain.value = 0;
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
chatGain.gain.value = 1;
chatGain.connect(masterGain);

let convolver = audioContext.createConvolver();
let revGain = audioContext.createGain();
revGain.gain.value=1.0;
convolver.connect(revGain);
revGain.connect(masterGain);
convolver.connect(masterGain);
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
const click = () => {
  modules.textPrint(ctx, canvas, "CLICK")
  let t0 = audioContext.currentTime;
//  clickGain.gain.value = 0.7;
  clickGain.gain.setValueAtTime(gainVal["CLICK"], t0);
  clickGain.gain.setTargetAtTime(0,t0,0.03);
  setTimeout(()=>{
    modules.whitePrint(ctx, canvas);
    // modules.textPrint(ctx, canvas, "");
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

const bassLine = [55,68.75,68.75,82.5,82.5,103.125,110];
let bassFlag = false;

const bass = ()  => {
  if(bassFlag){
    bassGain.gain.value = 0;
    bassFlag = false;
    modules.whitePrint(ctx, canvas);
  } else {
    modules.whitePrint(ctx, canvas);
    // console.log("vass");
    modules.textPrint(ctx, canvas, "BASS");
    bassOsc.frequency.value = bassLine[Math.floor(bassLine.length * Math.random())];
    bassGain.gain.value = gainVal["BASS"];
    bassFlag = true;
  }
}

const filterChange = () => {
  let returnValue = 0;
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
  filter.frequency.value = returnValue;
  return returnValue;
}

//video record/play ここから
let image;
let receive;
let receive_ctx;
const onAudioProcess = (e) => {
  if(videoMode != "none"){
    let bufferData = new Float32Array(bufferSize);
    e.inputBuffer.copyFromChannel(bufferData, 0);
    switch(videoMode){
      case "record":
      modules.chunkEmit({"audio":bufferData, "video":funcToBase64(buffer, video), "target": "PLAYBACK"},socket);
      break;
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
    }
  }
  if(timelapseFlag){
    let bufferData = new Float32Array(bufferSize);
    e.inputBuffer.copyFromChannel(bufferData, 0);
    let sendChunk = {"audio":bufferData, "video": funcToBase64(buffer, video), "target": "TIMELAPSE"};
    modules.chunkEmit(sendChunk,socket);
    timelapseFlag = false;
  }
}
const playAudioStream = (flo32arr, sampleRate, volume, glitch) => {
  let audio_buf = audioContext.createBuffer(1, bufferSize, sampleRate),
      audio_src = audioContext.createBufferSource();
  let audioData = new Float32Array(bufferSize);
  for(let i = 0; i < audioData.length; i++){
    audioData[i] = flo32arr[i] * volume;
  }
  audio_buf.copyToChannel(audioData, 0);
  // console.log(audio_buf);
  audio_src.buffer = audio_buf;
  audio_src.connect(masterGain);
  /*if(glitch){
    convolver.buffer = audio_buf;
    audio_src.connect(convolver);
  }*/
  audio_src.start(0);
}
//video record/play ここまで

const initialize = () =>{
  if(navigator.mediaDevices.getUserMedia){
    navigator.mediaDevices.getUserMedia({
      video: true, audio: /*true*/{
        "mandatory": {
          "googEchoCancellation": false,
          "googAutoGainControl": false,
          "googNoiseSuppression": false,
          "googHighpassFilter": false
        },"optional": []
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
      video.src = window.URL.createObjectURL(stream);
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

//keyboard
let stringsClient = "";


$(() =>{
  $(document).on("keydown", (e)=> {
    console.log(e.keyCode);
    if(e.keyCode === 188){
      if(standAlone) {
        standAlone = false;
        modules.whitePrint(ctx, canvas);
        modules.textPrint(ctx, canvas, "network connect");
        setTimeout(()=>{
          modules.whitePrint(ctx, canvas);
//          modules.textPrint(ctx, canvas, "");
        },300);
      } else {
        standAlone = true;
        modules.whitePrint(ctx, canvas);
        modules.textPrint(ctx, canvas, "stand alone");
        setTimeout(()=>{
          modules.whitePrint(ctx, canvas);
//          modules.textPrint(ctx, canvas, "");
        },300);
      }
      socket.emit('standAlonefromClient', standAlone);
    } else if(standAlone){
      // let charCode = keycodeMap[String(e.keyCode)];
      let charCode = modules.keycodeMap(String(e.keyCode));
      if(charCode === "enter"){
        // console.log(isNaN(Number(stringsClient)));
        if (isNaN(Number(stringsClient)) === false && stringsClient != "") {
          doCmd({
            "cmd":"SINEWAVE",
            "property": Number(stringsClient)
          });
//          console.log("sinewave stand alone")
        } else {
          doCmd({"cmd":stringsClient});
        }
        stringsClient = "";
      } else if(charCode === "escape") {
        doCmd({"cmd":"STOP"});
        stringsClient = "";
      } else if(charCode === "left_arrow" || charCode === "backspace"){
        stringsClient = "";
        modules.whitePrint(ctx, canvas);
      } else if(e.keyCode >= 48 && e.keyCode <= 90 || e.keyCode === 190 || e.keyCode === 189 || e.keyCode === 32 || e.keyCode === 16){
        switch(charCode){
          case "C":
            click();
            break;
          case "B":
            bass();
            break;
          case "F":
            doCmd({"cmd":"FEEDBACK"});
            break;
          case "W":
          case "N":
            doCmd({"cmd":"WHITENOISE"})
            break;
          case "S":
            doCmd({"cmd":"SAMPLERATE"});
            break;
          default:
            stringsClient = stringsClient + charCode;
            modules.whitePrint(ctx, canvas);
            modules.textPrint(ctx, canvas, stringsClient);
            break;
        }
      }
    } else {
      // let charCode = keycodeMap[String(e.keyCode)];
      let charCode = modules.keycodeMap(String(e.keyCode));
      stringsClient = modules.keyDownFunc(e.keyCode, stringsClient, socket);
      modules.whitePrint(ctx, canvas);
      modules.textPrint(ctx, canvas, stringsClient);
      if(e.keyCode === 17 || e.keyCode === 0){
        bass();
        strings = "";
        stringsClient = "";
      }
      // if(e.keyCode != 16){
        if(e.keyCode === 13 && stringsClient === "VOICE"){
          if(voice){
            voice = false;
            modules.whitePrint(ctx, canvas);
            modules.textPrint(ctx, canvas, "VOICE OFF");
            stringsClient = "";
            setTimeout(()=>{
              modules.whitePrint(ctx, canvas);
              modules.charEmit(37, socket);
            },500);
          } else {
            voice = true;
            modules.whitePrint(ctx, canvas);
            modules.textPrint(ctx, canvas, "VOICE MODE");
            stringsClient = "";
            setTimeout(()=>{
              modules.charEmit(37, socket);
            },500);
          }
//          stringsClient = "";
        }
      // }
      // if(charCode = "enter" && voice && stringsClient != "VOICE") {
        /*
      if(charCode === "enter" && voice && stringsClient != "VOICE"){
        ssu.text = stringsClient;
        speechSynthesis.speak(ssu);
        stringsClient = "";
      }*/
    }
  });
});


window.addEventListener("load", initialize, false);



// 関数
// canvas

let canvas = document.getElementById('cnvs');
let ctx = canvas.getContext('2d');
let buffer;
let bufferContext;

$(() => {
  sizing();
//  draw();
  $(window).resize(() =>{
    sizing();
  });
});
const sizing=() =>{
  $("#cnvs").attr({ height: $(window).height() });
  $("#cnvs").attr({ width: $(window).width() });
}



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

socket.on('stringsFromServer', (data) =>{
  modules.whitePrint(ctx, canvas);
  modules.textPrint(ctx, canvas, data);
});

socket.on('statusViewFromServer', ()=>{
  let statusText = modules.statusPrint(oscGain.gain.value, freqVal, feedbackGain.gain.value, noiseGain.gain.value, bassFlag);
  strings = "";
  stringsClient = "";
  modules.whitePrint(ctx, canvas);
  modules.textPrint(ctx, canvas, statusText);
  setTimeout(()=>{
    modules.whitePrint(ctx, canvas);
  },500)
});

socket.on('cmdFromServer', (data) => {
  if(standAlone === false){
    doCmd(data);
  }
});

socket.on('textFromServer', (data) => {
  if(voice && data != "VOICE"){
    ssu.text = data;
    speechSynthesis.speak(ssu);
  }
  stringsClient = "";
});

socket.on('instructionFromServer', (data) => {
  videoStop();
  modules.whitePrint(ctx, canvas);
  modules.textPrint(ctx, canvas, data["text"]);
  alertPlay();
  mode = "instruction"
  setTimeout(()=>{
    modules.whitePrint(ctx, canvas);
    mode = "none"
  }, data["duration"]);
});

socket.on('streamListFromServer', (data) =>{
  streamList = data;
  console.log(streamList);
});

socket.on('streamReqFromServer', (data) => {
  switch(data){
    case "CHAT":
      //if(chatBuffer!= {}){
        socket.emit('chunkFromClient', chatBuffer);
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
  //if(videoMode === "chat"){
  if(videoMode != "record"){
  if(videoMode != "chat") videoMode = "chat";
  if(data["audio"] != undefined && data["audio"] != "") {
    let chunkGain = 0.7;
    if(data["target"] in gainVal){
      chunkGain = gainVal[data["target"]];
    }
    if(data["sampleRate"] != undefined){
      playAudioStream(data["audio"],data["sampleRate"],chunkGain,data["glitch"]);
    } else {
      playAudioStream(data["audio"],44100,chunkGain,data["glitch"]);
    }
  }
  if(data["video"] != undefined && data["video"] != "") {
     playVideo(data["video"]);
  } else {
    modules.whitePrint(ctx, canvas);
    modules.textPrint(ctx, canvas, data["target"]);
  }
  if(data["target"] === "CHAT"){
    socket.emit('AckFromClient', "CHAT");
   // console.log("ack");
  } else {
    socket.emit('wavReqFromClient', data["target"]);
  }
  }
});


const doCmd = (cmd) => {
  // console.log("do cmd" + cmd["cmd"]);
  let t0 = audioContext.currentTime;
  switch(cmd["cmd"]){
    case "WHITENOISE":
    case "NOISE":
//      stop();
      if(noiseGain.gain.value > 0){
        mode = "none";
        noiseGain.gain.value = 0;
        modules.textPrint(ctx, canvas, "");
      } else {
        mode = "whitenoise";
        noiseGain.gain.value = gainVal["NOISE"];
        modules.whitePrint(ctx, canvas);
        modules.textPrint(ctx, canvas, "WHITENOISE");
      }
      break;
    case "CLICK":
      click();
      break;
    case "BASS":
      bass();
      break;
    case "SINEWAVE":
      modules.whitePrint(ctx, canvas);
      if(oscGain.gain.value > 0 && freqVal === cmd["property"]) {
        mode = "none";
        oscGain.gain.value = 0;
//        modules.textPrint(ctx, canvas, "");
      } else {
        mode = "sinewave";
        chordChange = 0;
        modules.textPrint(ctx, canvas, String(cmd["property"]) + "Hz");
        // console.log(t0);
        freqVal = cmd["property"];
        if(oscPortament === 0){
          osc.frequency.value = freqVal;
        } else {
          osc.frequency.setTargetAtTime(freqVal,t0,oscPortament);
        }
        oscGain.gain.value = gainVal["OSC"];
      }
      break;
    case "SINEWAVE_UP":
//      osc.frequency.value = osc.frequency.value + cmd["property"];
      freqVal = osc.frequency.value + cmd["property"];
      if(oscPortament === 0){
        osc.frequency.value = freqVal;
      } else {
        osc.frequency.setTargetAtTime(freqVal,t0,oscPortament);
      }
      modules.whitePrint(ctx, canvas);
      mode = "sinewave";
      chordChange = 0;
      modules.textPrint(ctx, canvas, String(freqVal) + "Hz");
      oscGain.gain.value = gainVal["OSC"];
      break;
    case "SINEWAVE_DOWN":
      modules.whitePrint(ctx, canvas);
      freqVal = osc.frequency.value - cmd["property"];
      if(freqVal >= 0){
        if(oscPortament === 0){
          osc.frequency.value = freqVal;
        } else {
          osc.frequency.setTargetAtTime(freqVal,t0,oscPortament);
        }
        mode = "sinewave";
        chordChange = 0;
        modules.textPrint(ctx, canvas, String(freqVal) + "Hz");
        oscGain.gain.value = gainVal["OSC"];
      }
      break;
    case "PORTAMENT":
      modules.whitePrint(ctx, canvas);
      modules.textPrint(ctx, canvas, "PORTAMENT: " + String(cmd["property"]) + "SEC");
      oscPortament = cmd["property"];
      break;
    case "FEEDBACK":
    case "FEED":
      if(feedbackGain.gain.value > 0) {
        mode = "none";
        feedbackGain.gain.value = 0;
        modules.whitePrint(ctx, canvas);
      } else {
        mode = "feedback"
        // console.log("feedback")
        feedbackGain.gain.value = gainVal["FEEDBACK"];
        modules.whitePrint(ctx, canvas);
        modules.textPrint(ctx, canvas, "FEEDBACK");
      }
      break;
    case "FILTER":
      let printText = filterChange();
      modules.whitePrint(ctx, canvas);
      modules.textPrint(ctx, canvas, "FILTER: " + String(printText) + "Hz");
      setTimeout(() => {
        modules.whitePrint(ctx, canvas);
//        modules.textPrint(ctx, canvas, "");
      },800);
      break;
    case "GAIN":
      //console.log("TEST");
      modules.textPrint(ctx, canvas, cmd["property"]["target"] + ": " + String(cmd["property"]["val"]));
      gainVal[cmd["property"]["target"].substr(0,cmd["property"]["target"].length - 4).toUpperCase()] = Number(cmd["property"]["val"]);
      if(eval(cmd["property"]["target"]) != undefined){
        if(cmd["property"]["target"] != "clickGain" && (cmd["property"]["target"] === "masterGain" || eval(cmd["property"]["target"]).gain.value > 0)){
          eval(cmd["property"]["target"]).gain.value = Number(cmd["property"]["val"]);
        }

        console.log(eval(cmd["property"]["target"]).gain);
      // } else {
        // streamGain[cmd["property"]["target"].substr(0,cmd["property"]["target"].length - 4).toUpperCase] = Number(cmd["property"]["val"]);
      }
      // console.log(gainVal);
      if(cmd["property"]["target"] === masterGain){
        masterGain.gain.value = Number(cmd["property"]["val"]);
      }
      setTimeout(()=>{
        modules.whitePrint(ctx, canvas);
      }, 500)
      break;
    case "VOLUME":
      if(cmd["property"] === "UP"){
        modules.whitePrint(ctx, canvas);
        if(masterGain.gain.value === 1){
          modules.textPrint(ctx, canvas, "VOLUME IS FULL");
          setTimeout(()=>{
            modules.whitePrint(ctx, canvas);
          }, 500);
        } else {
          masterGain.gain.value = masterGain.gain.value + 0.1;
          modules.textPrint(ctx, canvas, "VOLUME " + cmd["property"]);
          setTimeout(()=>{
            modules.whitePrint(ctx, canvas);
          }, 500);
        }
      } else if(cmd["property"] === "DOWN"){
        modules.whitePrint(ctx, canvas);
        if(masterGain.gain.value === 0){
          modules.textPrint(ctx, canvas, "MUTED");
          setTimeout(()=>{
            modules.whitePrint(ctx, canvas);
          }, 500);
        } else {
          masterGain.gain.value = masterGain.gain.value - 0.1;
          modules.textPrint(ctx, canvas, "VOLUME " + cmd["property"]);
          setTimeout(()=>{
            modules.whitePrint(ctx, canvas);
          }, 500);
        }
      } else {
        if(isNaN(Number(cmd["property"])) === false && cmd["property"] != ""){
          masterGain.gain.value = Number(cmd["property"]);
        }
        modules.textPrint(ctx, canvas, "VOLUME " + cmd["property"]);
        setTimeout(()=>{
          modules.whitePrint(ctx, canvas);
        }, 500);
      }
      prevGain = masterGain.gain.value;
      break;
    case "MUTE":
      //if(cmd["property"]){
      if(masterGain.gain.value > 0){
        prevGain = masterGain.gain.value;
        masterGain.gain.value = 0;
        modules.whitePrint(ctx, canvas);
        modules.textPrint(ctx, canvas, "MUTE");
        setTimeout(()=>{modules.whitePrint(ctx, canvas);},500);
      } else {
        masterGain.gain.value = prevGain;
        modules.whitePrint(ctx, canvas);
        modules.textPrint(ctx, canvas, "UNMUTE");
        setTimeout(()=>{modules.whitePrint(ctx, canvas);},500);
      }
      break;
    case "SWITCH ON":
    case "SWITCH OFF":
      modules.whitePrint(ctx, canvas);
      modules.textPrint(ctx, canvas, cmd["cmd"]);
      setTimeout(()=>{
        modules.whitePrint(ctx, canvas);
      }, 1500);
      break;
    case "RECORD":
    case "REC":
      videoStop();
      videoMode = "record";
      modules.whitePrint(ctx, canvas);
      modules.textPrint(ctx, canvas, "RECORD");
      setTimeout(() => {
        if(videoMode === "record"){
          videoMode = "none";
          modules.whitePrint(ctx, canvas);
        }
      }, 5000); //時間は考え中
      break;
    case "SHUTTER":
      if(cmd["property"] === "oneshot"){
        timelapseFlag = true;
      } else if(cmd["property"] === "timelapse"){
        timeLapse();
      } else if(cmd["property"] === "stoplapse"){
        stopLapse();
      }
      break;
    case "SECBEFORE":
      streamBuffer = [];
      modules.whitePrint(ctx, canvas);
      modules.textPrint(ctx, canvas, String(cmd["property"]) + "SEC BEFORE");
      videoMode = "pastBuff";
      if(cmd["rate"] != undefined){
        bufferRate = cmd["rate"];
      } else {
        bufferRate = 44100;
      }
      setTimeout(()=>{
        modules.whitePrint(ctx, canvas);
        videoMode = "pastPlay";
      },cmd["property"] * 1000);
      break;
    case "PREV":
      pastPresent(cmd["property"]);
      break;
    case "STOP":
      stop();
      videoStop();
      setTimeout(()=>{
        modules.whitePrint(ctx, canvas);
      }, 500);
      break;
    case "CTRL":
      console.log(cmd["property"]);
      if($('#ctrl').size()){
        $('#ctrl').remove();
      } else {
        let addHTML = modules.ctrlView(cmd["property"]);
        $('#wrapper').before('<div id="ctrl">' + addHTML + '</div>');
      }
      break;
    case "INSTRUCTION":
      videoStop();
      modules.whitePrint(ctx, canvas);
      modules.textPrint(ctx, canvas, cmd["property"]["text"]);
      if(client != "inside") alertPlay();
      mode = "instruction"
      setTimeout(()=>{
        modules.whitePrint(ctx, canvas);
        mode = "none"
      }, cmd["property"]["duration"]);
      break;
    default:
      console.log(cmd["cmd"]);
      for(let key in streamList){
        if(key === cmd["cmd"]){
          // console.log(cmd["cmd"]);
          videoMode = "chat";
          modules.whitePrint(ctx, canvas);
          modules.textPrint(ctx, canvas, cmd["cmd"]);
          setTimeout(()=> {
            modules.whitePrint(ctx, canvas);
          },800);
        }
      }
      break;

  }
  strings = "";
  stringsClient = "";
}
/*
const munouNoUnmei = (data) =>{
  modules.whitePrint(ctx, canvas);
  console.log(data);
  let speed = 0;
  if(room = "surface"){
    speed = (Math.round((data["speed"] - 0.88) * 1000) / 1000);
  } else {
    speed = (Math.round((data["speed"] - 0.75) * 1000) / 1000);
  }
  //data = Math.round(data * 1000) / 1000;
  modules.textPrint(ctx, canvas, data["room"] + ": " + String(speed) + "m/s");
  let freqVal = 110;
  let cT = audioContext.currentTime;
  if(data["speed"] < 4) {
    freqVal = 110 * Math.pow(2,data["speed"] * 2 / 12);  //1m/s^2を1度としている
  } else if(data < 8) {
    freqVal = 110 * Math.pow(2,(data["speed"]-1) * 2 /12 + 1 / 12);  //1m/s^2を1度としている
  } else {
    freqVal = 110 * Math.pow(2,(data["speed"] - 2) * 2 /12 + 2 / 12);  //1m/s^2を1度としている
  }
  if(munouGain.gain.value === 0) munouGain.gain.value = 0.7;
  munouOsc.frequency.setTargetAtTime(freqVal,cT,0.3);
}
*/

const stop = () => {
  oscGain.gain.value = 0;
  feedbackGain.gain.value = 0;
  noiseGain.gain.value = 0;
  bassGain.gain.value = 0;
  //munouGain.gain.value = 0;
  bassFlag = false;
  modules.whitePrint(ctx, canvas);
//  modules.textPrint(ctx, canvas, "");
  mode = "none";
  modules.textPrint(ctx, canvas, "STOP");
}

const videoStop = () => {
  switch (videoMode) {
    case "chunkEmit":
      break;
    case "beforePlay":
    case "beforeBuff":
    default:
      videoMode = "none";
      break;
  }
}


const pastPresent = (status) =>{
  // console.log(status);
  for(let key in status){
    if(key === "SINEWAVE" && status[key]){
      doCmd({"cmd":key, "property": Number(status[key])});
    } else if(key === "SECBEFORE" && status[key]){
      videoMode = "pastPlay";
    } else if(status[key]){
      doCmd({"cmd":key});
    }
  }
}

const playVideo = (video) => {
//  whitePrint();
  image = new Image();
  image.src = video;
  var wdth;
  var hght;
  wdth = $(window).width();
  hght = (wdth * 3) / 4;

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
  // if(videoMode === "none"){
    // console.log("送信");
    timelapseFlag = true;
  // }
}, emitInterval);
*/

//ctrlView ctrl

$(function() {
  $(document).on('change', '.range', function(){
    console.log("range change");
    let ctrlCmd;
    let ctrlProperty;
    if($(this).attr('id') === "CHATRATE"){
      ctrlCmd = "CHATRATE"
      ctrlProperty ={
        "target": $(this).attr('name'),
        "val" : $(this).val()
      };
      let test ='label[name="' + ctrlProperty["target"] + '"]#CHATRATELabel';
      console.log(test);
      $('label[name="' + ctrlProperty["target"] + '"]#CHATRATELabel').text(String(ctrlProperty["val"]));
    } else if($(this).attr('id').match(/^LATENCY/) || $(this).attr('id').match(/^RATE/) ) {
      let val = $(this).val();
      let targetArr = $(this).attr('id').split("_");
      if(targetArr[0] === "LATENCY") val = val * 1000;
      ctrlCmd = targetArr[0];
      ctrlProperty = {
        "target": $(this).attr('name'),
        "streamType": targetArr[1],
        "val": val
      }
      $('#' + targetArr[0] + 'Label').text(val);
      setTimeout(()=>{
        $('#' + targetArr[0] + 'Label').text(targetArr[0]);
      },2000);
    } else {
      ctrlCmd = $(this).attr('name');
      ctrlProperty = {
        "target" : $(this).attr('id'),
        "val" : $(this).val()
      };
      $('#' + ctrlCmd + ctrlProperty["target"] + 'Label').text(String(ctrlProperty["val"]));
    }
    console.log(ctrlCmd);
    console.log(ctrlProperty);
    socket.emit('cmdFromCtrl',{
      "cmd": ctrlCmd,
      "property": ctrlProperty
    });
  });
});

$(function() {
  $(document).on('change', '.route', function(){
    let property = {
      "target" : $(this).attr('name'),
      "stream" : $(this).attr('id').split("_")[0],
      "val" : $(this).prop('checked')
    };
    console.log(property);
    socket.emit('cmdFromCtrl',{
      "cmd": $(this).attr('id').split("_")[1],
      "property": property
    });
  });
});

const funcToBase64 = () =>{
  //console.log(buffer);
  let bufferContext = buffer.getContext('2d');
  buffer.width = video.videoWidth;
  buffer.height = video.videoHeight;
  bufferContext.drawImage(video, 0, 0);
  //return buffer.toDataURL("image/webp");
  return buffer.toDataURL("image/jpeg");
}
