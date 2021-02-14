const modules = require('./module.js');
let gainVal = {
  "master": 0.95,
  "FEEDBACK": 0.35,
  "OSC": 0.15,
  "BASS": 0.15,
  "CLICK": 0.4,
  "NOISE": 0.3,
  "CHAT": 0.45,
  "PLAYBACK": 0.45,
  "TIMELAPSE": 0.45,
  "DRUM": 0.6,
  "SECBEFORE": 0.45,
  "SILENCE": 0,
  "GLITCH": 1,
  "BEAT": 1
}
let videoMode = {"mode": "none", "option": "none"}; //"record" or "playback"
let standAlone = false;
let streamList;

console.log(socket)

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;
let video;
let buffer = document.createElement('canvas');

let start = false
let audioContext
let masterGain
let lpFilter
let feedbackGain
let filter
let solFilter
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
let pan

let chatGain
let convolver
let glitchGain
//analyser
let analyser
let approximatelyOsc
let approximatelyGain
let fftSize = 2048

let beatGain

let fadeVal = {
  "IN": 0,
  "OUT": 0
}
let cmdMode = {
  "sinewave": false,
  "whitenoise": false,
  "feedback": false,
  "instruction": false,
  "FACEDETECT":{
    "FLAG": false
  },
  "CHAT": {
    "BGN": false
  },
  "BPM": 60,
  "metronome": false,
  "BEAT": false,
  "THREE": false,
  "DARK": false
}
const userAgent = window.navigator.userAgent.toLowerCase()
if(userAgent.indexOf('iphone') != -1 || userAgent.indexOf('android') != -1) {
  cmdMode.mobile = true
} else {
  cmdMode.mobile = false
}

console.log(window.navigator.userAgent)

let prevGain = 0.7;

let oscPortament = 0;
let streamBuffer = [];
let quantizeBuffer = {}
let bufferSize = 8192;
let bufferRate = 48000;
let chatBuffer = {};

let timelapseFlag = false;
let playsampleRate = 48000
let playTarget = ""
let localSampleRate = 0

let tileFlag = false
let quantizeInterval = null

// voice
let ssu = new SpeechSynthesisUtterance();
ssu.lang = 'en-EN';
ssu.rate = 1
let voice =false;
let textPrintProtect = false

let freqVal;

let alertBuffer = null;
let kickBuffer = null;
let snareBuffer = null;
let hatBuffer = null;


const click = (frequency) => {
  let currentTime = audioContext.currentTime
  if(frequency){
    clickOsc.frequency.setValueAtTime(frequency,0)
  } else {
    clickOsc.frequency.setValueAtTime(440,0)
  }
  modules.textPrint(stx, strCnvs, "CLICK", cmdMode.DARK)
  clickGain.gain.setValueAtTime(gainVal["CLICK"], currentTime);
  clickGain.gain.setTargetAtTime(0,currentTime,0.03);
  setTimeout(()=>{
    modules.erasePrint(stx, strCnvs);
  },300);
}

const bassLine = {
  "LOW": [55,55,68.75,73.4,82.4,82.4],
  "HIGH": [98,103.8,110,110]
};
let bassFlag = false;

const bass = (position)  => {
  let currentTime = audioContext.currentTime
  if(bassFlag){
    bassGain.gain.setTargetAtTime(0,currentTime,0.02);
    bassFlag = false;
    modules.erasePrint(stx, strCnvs);
  } else {
    modules.erasePrint(stx, strCnvs);
    modules.textPrint(stx, strCnvs, "BASS", cmdMode.DARK);
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
let loopCount = Math.random() * 10
const onAudioProcess = (e) => {
  if(videoMode.mode != "none" && videoMode.mode != "wait"){
    let bufferData = new Float32Array(bufferSize);
    e.inputBuffer.copyFromChannel(bufferData, 0);
    if(videoMode.mode === "record"){
      console.log("debug record mode")
      if(videoMode.option === "none") {
        socket.emit('chunkFromClient', {"audio":bufferData, "video":toBase64(buffer, video), "target": "PLAYBACK"})
      } else if(videoMode.option === "local") {
        streamBuffer.push({
          "audio": bufferData,
          "video": toBase64(buffer, video)
        });
        console.log("streamBuffer: " + String(streamBuffer.length))
      } else {
        socket.emit('chunkFromClient', {"audio":bufferData, "video":toBase64(buffer, video), "target": videoMode.option})
        console.log(videoMode.option)
      }
    } else if(videoMode.option === "loop" && videoMode.mode === "chat"){
      if(streamBuffer.length > loopCount) {
        shiftBuff = streamBuffer.shift()
        console.log(shiftBuff.video)
        console.log(streamBuffer.length)
        console.log(shiftBuff.debug)
        playAudioStream(shiftBuff.audio, bufferRate, 1, false)
        playVideo(shiftBuff.video)
        streamBuffer.push(shiftBuff)
      } else {
        if("audio" in chatBuffer && "video" in chatBuffer) {
          streamBuffer.push({"audio": bufferData, "video": toBase64(buffer, video)})
          console.log(streamBuffer.length)
          streamBuffer[streamBuffer.length - 1].debug = streamBuffer.length
          playAudioStream(bufferData,bufferRate,1,false);
          playVideo(toBase64(buffer, video))
        }
      }
      socket.emit('AckFromClient', "CHAT")
    //} else if(videoMode.option === "metronome" && videoMode.mode === "chat"){
    } else {
      switch(videoMode.mode){
        case "chat":
          chatBuffer["audio"] = bufferData;
          chatBuffer["video"] = toBase64(buffer, video);
          chatBuffer["target"] = "CHAT";
          console.log(chatBuffer);
          break;
        case "pastBuff":
          streamBuffer.push({
            "audio": bufferData,
            "video": toBase64(buffer, video)
          });
          console.log(streamBuffer.length) //debug
          break;
        case "pastPlay":
          let beforeChunk = {};
          if(streamBuffer.length>0){
            beforeChunk = streamBuffer.shift();
          } else {
            beforeChunk = {"audio": bufferData, "video": toBase64(buffer, video)};
          }
            playAudioStream(beforeChunk["audio"],bufferRate,gainVal["SECBEFORE"],false);
            playVideo(beforeChunk["video"]);
             console.log(streamBuffer.length);
            streamBuffer.push({
              "audio": bufferData,
              "video": toBase64(buffer, video)
            })
          break;
        case "playback":
          let playChunk = {};
          if(streamBuffer.length>0){
            console.log(playChunk.audio)
            playChunk = streamBuffer.shift();
            playAudioStream(playChunk.audio,bufferRate,gainVal.PLAYBACK,false);
            playVideo(playChunk.video);
            streamBuffer.push(playChunk)
          }
          break;
      }
    }
  }
  if(timelapseFlag){
    let bufferData = new Float32Array(bufferSize);
    e.inputBuffer.copyFromChannel(bufferData, 0);
    let sendChunk = {"audio":bufferData, "video": toBase64(buffer, video), "target": "TIMELAPSE"};
    socket.emit('chunkFromClient', sendChunk)
    timelapseFlag = false;
  }
  if(cmdMode.CHAT.BGN){
    let freqData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(freqData);
    console.log(freqData.length)
    let freq = {freq:0,val:0}
    for (let i = 0, len = freqData.length; i < len; i++) {
      if(freq.val < freqData[i]) freq = {freq:(i*22050/analyser.fftSize), val:freqData[i]/256}
    }
    freq.val = freq.val * 1 //later
    if(freq.val > 1) freq.val = 1
    console.log(freq)
    let currentTime = audioContext.currentTime;
    approximatelyOsc.frequency.setTargetAtTime(freq.freq,currentTime,0.05)
  }
}
const debugPlay = (flo32arr, sampleRate, volume, glitch) => {
  let audio_buf = audioContext.createBuffer(1, bufferSize, sampleRate),
      audio_src = audioContext.createBufferSource();

  let audioData = audio_buf.getChannelData(0);
  for(let i = 0; i < audioData.length; i++){
    audioData[i] = flo32arr[i];
  }
  console.log(flo32arr)

  audio_src.buffer = audio_buf;
  audio_src.connect(chatGain);

  audio_src.start(0);

}
const playAudioStream = (flo32arr, sampleRate, volume, glitch) => {
  let audio_src = audioContext.createBufferSource();
  let audioData = new Float32Array(bufferSize);
  for(let i = 0; i < audioData.length; i++){
    audioData[i] = flo32arr[i] * volume;
  }
  if(!glitch){
    let audio_buf = audioContext.createBuffer(1, bufferSize, sampleRate)
    audio_buf.copyToChannel(audioData, 0);
    audio_src.buffer = audio_buf;
    audio_src.connect(chatGain);
  } else {
    let audio_buf = audioContext.createBuffer(1, bufferSize, convolver.context.sampleRate)
    audio_buf.copyToChannel(audioData, 0);

    audio_src.buffer = audio_buf;
    convolver.buffer = audio_buf;
    audio_src.connect(convolver);
  }
  audio_src.start(0);
}
//video record/play ここまで


const initialize = () =>{
  modules.erasePrint(stx, strCnvs);
  socket.emit("startFromClient")
  start = true
  console.log("start")
  //audioContext
  audioContext = new AudioContext();
  masterGain = audioContext.createGain();
  masterGain.gain.setValueAtTime(gainVal["master"],0)
  masterGain.connect(audioContext.destination);
  pan = audioContext.createPanner();
  pan.panningModel = "equalpower"
  pan.setPosition(0,0,0)
  pan.connect(masterGain)
  // LPF
  lpFilter = audioContext.createBiquadFilter();
  lpFilter.type = "lowpass";
  lpFilter.frequency.value = 20000;
  lpFilter.Q.value = 0;
  lpFilter.gain.value = 1;
  
  // solfage LPF
  solFilter = audioContext.createBiquadFilter();
  solFilter.type = "lowpass";
  solFilter.frequency.setValueAtTime(1000,0);
  // feedback
  feedbackGain = audioContext.createGain();
  feedbackGain.gain.setValueAtTime(0,0);
  filter = audioContext.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 20000;
  filter.Q.value = 0;
  filter.gain.value = 1;
  //record/play
  javascriptnode = audioContext.createScriptProcessor(8192, 1, 1);
  // sinewave
  osc = audioContext.createOscillator();
  oscGain = audioContext.createGain();
  osc.connect(oscGain);
  osc.frequency.setValueAtTime(440, 0);
  oscGain.gain.setValueAtTime(0,0);
  oscGain.connect(masterGain)
  osc.start(0);

  approximatelyOsc = audioContext.createOscillator();
  approximatelyGain = audioContext.createGain();
  approximatelyOsc.connect(approximatelyGain);
  approximatelyOsc.frequency.setValueAtTime(440, 0);
  approximatelyGain.gain.setValueAtTime(0,0);
  approximatelyGain.connect(masterGain)
  approximatelyOsc.start(0);
  

  bassOsc = audioContext.createOscillator();
  bassGain = audioContext.createGain();
  bassOsc.connect(bassGain);
  bassGain.connect(masterGain)
  bassOsc.frequency.setValueAtTime(20,0)
  bassGain.gain.setValueAtTime(0,0);
  bassOsc.start(0);
  clickOsc = audioContext.createOscillator();
  clickGain = audioContext.createGain();
  clickOsc.connect(clickGain);
  clickGain.connect(masterGain)
  clickOsc.frequency.setValueAtTime(440,0)
  clickGain.gain.setValueAtTime(0,0);
  clickOsc.start(0);
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
  chatGain.gain.setValueAtTime(gainVal.CHAT,0);
  chatGain.connect(masterGain);

  //beat
  beatGain = audioContext.createGain();
  beatGain.gain.setValueAtTime(gainVal.BEAT,0);
  beatGain.connect(masterGain);

  convolver = audioContext.createConvolver();
  glitchGain = audioContext.createGain();
  glitchGain.gain.setValueAtTime(0.1,0);
  
  convolver.connect(glitchGain);
  glitchGain.connect(masterGain);
  loadKick(audioContext, "/files/KICK.wav")
  loadSnare(audioContext, "/files/SNARE.wav")
  loadHat(audioContext, "/files/HAT.wav")

  //face detect
  video = document.getElementById('video');
  video.width  = 640;
  video.height = 480
  video.play();

  const SUPPORTS_MEDIA_DEVICES = 'mediaDevices' in navigator;
    if (SUPPORTS_MEDIA_DEVICES && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const cameras = devices.filter((device) => device.kind === 'videoinput');
        if (cameras.length === 0) {
          throw 'No camera found on this device.';
        }
        console.log(devices);
        console.log(cameras);
        const camera = cameras[cameras.length - 1];
        navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: camera.deviceId,
            facingMode: ['user', 'environment'],
            height: {ideal: 1080},
            width: {ideal: 1920}
          },audio : true 
        }).then((stream) =>{
          let mediastreamsource = void 0;
          mediastreamsource = audioContext.createMediaStreamSource(stream);
          mediastreamsource.connect(javascriptnode);
          mediastreamsource.connect(feedbackGain);
          feedbackGain.connect(masterGain);
          //analyser
          analyser = audioContext.createAnalyser();
          mediastreamsource.connect(solFilter);
          solFilter.connect(analyser);
          bufferLength = analyser.frequencyBinCount;

          //face detect
          video.srcObject = stream
          video.volume = 0;
          renderStart();
          //modules.textPrint(stx,strCnvs,String(imageCapture))
        },  (e) =>{
          return console.log(e)
        })
      })
    //}
  } else { //chromium 50.0.2625.0
    navigator.getUserMedia({
      video: true, audio: {
        "mandatory": {
          "googEchoCancellation": false,
          "googAutoGainControl": false,
          "googNoiseSuppression": false,
          "googHighpassFilter": false,
          "echoCancellation" : false, 
          "googEchoCancellation": false
        },"optional": []
      } 
    }, (stream) =>{
    //}, (stream) =>{
      let mediastreamsource = void 0;
      mediastreamsource = audioContext.createMediaStreamSource(stream);
      //mediastreamsource.connect(filter);
      //filter.connect(javascriptnode);
      //filter.connect(feedbackGain);
      mediastreamsource.connect(javascriptnode);
      mediastreamsource.connect(feedbackGain);
      feedbackGain.connect(masterGain);
      //analyser
      analyser = audioContext.createAnalyser();
      analyser.fftSize = fftSize;
      mediastreamsource.connect(analyser);
      bufferLength = analyser.frequencyBinCount;
      //face detect 
      video.src = window.URL.createObjectURL(stream);
      video.volume = 0;
      renderStart();
    },  (e) =>{
      return console.log(e);
    });
  }
  //rec
  javascriptnode.onaudioprocess = onAudioProcess;
  javascriptnode.connect(masterGain);

  //video
  image = document.createElement("img");
  receive = document.getElementById("cnvs");
  receive_ctx = receive.getContext("2d");

  if(streamFlag) videoMode.mode = "chat" 
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
  cmdMode.metronome = true
  metronome = setInterval(()=>{
    if(rhythmProperty.score[metronomeCount] === 1){
      if(timbre === "CLICK"){
        click()
      } else if(timbre === "STREAM"){
        if("audio" in chatBuffer) {
          playAudioStream(chatBuffer.audio,bufferRate,1,false);
        }
        if("video" in chatBuffer){
          playVideo(chatBuffer["video"]);
          modules.textPrint(stx, strCnvs, "LOOP", cmdMode.DARK);
        } else {
          modules.erasePrint(ctx, canvas);
          modules.textPrint(ctx, canvas, stringsClient, cmdMode.DARK);
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
  cmdMode.metronome = false
  clearInterval(metronome);
  if(videoMode.option === "metronome") videoMode.option = "none"
}

//keyboard
let stringsClient = "";
const keyDown = (e) => {
  //console.log(e.keyCode);
  //console.log(e.shiftKey);
  let charCode = keyMap[e.keyCode]
  if(e.shiftKey && e.keyCode !== 16) charCode = shiftKeyMap[e.keyCode]
  if(charCode === "enter" && !start) initialize()
  if(!standAlone) {
    if(charCode === "enter" && (stringsClient === "LOCAL" || stringsClient === "STANDALONE" || stringsClient === "NETWORK" || stringsClient === "CONNECT")){
      standAlone = true;
      modules.erasePrint(stx, strCnvs);
      modules.textPrint(stx, strCnvs, "stand alone", cmdMode.DARK);
      socket.emit('charFromClient', 40)
      stringsClient = ""
      setTimeout(()=>{
        modules.erasePrint(stx, strCnvs);
      },300);
    } else {  //Normal mode
      if(e.keyCode >= 48 && e.keyCode <= 90 || e.keyCode >= 186 && e.keyCode <= 191 || e.keyCode >= 219 && e.keyCode <= 221 || e.keyCode === 226 || e.keyCode === 32){
        stringsClient = stringsClient + charCode;
      }
      console.log(charCode)
      socket.emit('charFromClient', charCode);
    }

      if(charCode === "enter" && stringsClient != "VOICE") stringsClient = ""
      modules.erasePrint(stx, strCnvs);
      modules.textPrint(stx, strCnvs, stringsClient, cmdMode.DARK);
  } else { //STANDALONE
    if(charCode === "enter"){
      if(stringsClient === "LOCAL" || stringsClient === "STANDALONE" || stringsClient === "NETWORK" || stringsClient === "CONNECT"){
        standAlone = false;
        modules.erasePrint(stx, strCnvs);
        modules.textPrint(stx, strCnvs, "network connect", cmdMode.DARK);
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
          modules.textPrint(stx, strCnvs, "RECORD", cmdMode.DARK);
          console.log(videoMode.mode)
          stringsClient = ""
          setTimeout(()=>{
            videoMode.mode = prevVidMode
            modules.erasePrint(stx, strCnvs)
          },20000)
        } else if(stringsClient === "PLAYBACK" || stringsClient === "PLAY") {
          modules.erasePrint(stx, strCnvs);
          modules.textPrint(stx, strCnvs, "PLAYBACK", cmdMode.DARK);
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
      modules.textPrint(stx, strCnvs, stringsClient, cmdMode.DARK);
    } else if(e.keyCode >= 48 && e.keyCode <= 90 || e.keyCode === 190 || e.keyCode === 189 || e.keyCode === 32 || e.keyCode === 16){
      stringsClient = stringsClient + charCode
      modules.erasePrint(stx, strCnvs);
      modules.textPrint(stx, strCnvs, stringsClient, cmdMode.DARK);
    }
  }
}

let eListener = document.getElementById("wrapper")
eListener.addEventListener("click", (()=>{
  if(!start) initialize()
}), false);
window.addEventListener('resize', (e) =>{
  console.log('resizing')
  sizing()
})
document.addEventListener('keydown', (e) => {
  console.log(e)
  keyDown(e)
})

// canvas

let canvas = document.getElementById('cnvs');
let ctx = canvas.getContext('2d');
let strCnvs = document.getElementById('strCnvs');
let stx = strCnvs.getContext('2d');
let bckCnvs = document.getElementById('bckCnvs');
let btx = bckCnvs.getContext('2d');
//let buffer;
let bufferContext;

const sizing =() =>{
  document.getElementById("cnvs").setAttribute("height", String(window.innerHeight) + "px")
  document.getElementById("cnvs").setAttribute("width", String(window.innerWidth) + "px")
  document.getElementById("strCnvs").setAttribute("height", String(window.innerHeight) + "px")
  document.getElementById("strCnvs").setAttribute("width", String(window.innerWidth) + "px")
  document.getElementById("bckCnvs").setAttribute("height", String(window.innerHeight) + "px")
  document.getElementById("bckCnvs").setAttribute("width", String(window.innerWidth) + "px")
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

let streamFlag = false
// socket
socket.emit('connectFromClient', "client");
socket.on('connectFromServer', (data) => {
  rhythmProperty = data.clientStatus.rhythm
  for(let key in data.streamFlag) {
    if(data.streamFlag[key]) streamFlag = true
  }
})
socket.on('stringsFromServer', (data) =>{
  if(!textPrintProtect) {
    stx.clearRect(0, 0, strCnvs.width, strCnvs.height);
    console.log(data)
    stringsClient = data
    modules.textPrint(stx,strCnvs, stringsClient, cmdMode.DARK)
  }
});
socket.on('erasePrintFromServer',() =>{
  stx.clearRect(0, 0, strCnvs.width, strCnvs.height);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

socket.on('statusViewFromServer', ()=>{
  let statusText = modules.statusPrint(oscGain.gain.value, freqVal, feedbackGain.gain.value, noiseGain.gain.value, bassFlag);
  strings = "";
  stringsClient = "";
  modules.erasePrint(stx, strCnvs);
  modules.textPrint(stx, strCnvs, statusText, cmdMode.DARK);
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
    if(data.target === undefined || data.target === String(socket.id)){
      doCmd(data);
      textPrintProtect = true
      setTimeout(()=>{
        textPrintProtect = false
      },1000)
    } else {
      modules.erasePrint(stx, strCnvs);
      modules.textPrint(stx, strCnvs, data.cmd, cmdMode.DARK);
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
  if(!textPrintProtect) {
    modules.erasePrint(stx, strCnvs)
    modules.textPrint(stx,strCnvs, data.text, cmdMode.DARK)
    speakVoice(data.text)
    stringsClient = "";
    
    if(data.timeout === undefined || (data.timeout != undefined && data.timeout)) {
      setTimeout(()=>{modules.erasePrint(stx,strCnvs)},500)
    }
  }
});

socket.on('instructionFromServer', (data) => {
  videoStop();
  modules.erasePrint(stx, strCnvs);
  modules.textPrint(stx, strCnvs, data["text"], cmdMode.DARK);
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
  if(chatBuffer!= {} && videoMode.option != "loop") {
    socket.emit('chunkFromClient', chatBuffer);
  } else if(chatBuffer === {} ){
    socket.emit('AckFromClient', "CHAT")
  }
});

socket.on('oscFromServer',(data) => {
  if(data[0] === "/hitx" || data[0] === "/hity"){
    x = Math.round(window.innerWidth * data[1] / 1680)
    y = Math.round(window.innerHeight * data[2] / 1050)
    wdth = window.innerWidth - (x * 2)
    hght = wdth * 3 / 4
  }
});
socket.on('chunkFromServer', (data) => {
  console.log(data)
  if(videoMode.mode != "record"){
    if(videoMode.mode != "chat" && data.target === "CHAT" && videoMode.mode != "wait") videoMode.mode = "chat"
    
    if(videoMode.mode != "wait"){
      if(videoMode.option !== "loop") {
        playTarget = data.target
        if(data["audio"] != undefined && data["audio"] != "") {
          let chunkGain = 0.7;
          if(data["target"] in gainVal){
            chunkGain = gainVal[data["target"]];
          }
          if(data.sampleRate != undefined){
          if(localSampleRate === 0) {
              playsampleRate = Number(data.sampleRate)
            } else {
              playsampleRate = localSampleRate
            }
          }
          console.log("rate:"+ String(playsampleRate))
          console.log("serverrate:"+ String(data.sampleRate))
          let drumRate = playsampleRate / 44100
          if(videoMode.option != "quantize"){ 
            if(data.target === "INTERNET"){
              debugPlay(data["audio"],playsampleRate,chunkGain,data["glitch"]);
            } else if (data.target === "DRUM") {
              console.log(data.target)
            } else if (data.target === "KICK") {
              kickPlay(drumRate)
              console.log(data.target)
            } else if (data.target === "SNARE") {
              snarePlay(drumRate)
              console.log(data.target)
            } else if (data.target === "HAT") {
              hatPlay(drumRate)
              console.log(data.target)
            } else {
              playAudioStream(data["audio"],playsampleRate,chunkGain,data["glitch"]);
            }
          } else {
            quantizeBuffer.audio = data.audio
          }
        }
        if(data["video"] != undefined && data["video"] != "") {
          if(videoMode.option != "quantize") {
            playVideo(data.video, data.source);
          } else {
            quantizeBuffer.video = data.video
          }
        } else if(data.target != "CHAT"){
          console.log(data.video)
          modules.erasePrint(stx, strCnvs);
          modules.textPrint(stx, strCnvs, data["target"], cmdMode.DARK);
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
  console.log("debug") 
  if(voice && data != "VOICE" && data != undefined){
    ssu.text = data;
    speechSynthesis.speak(ssu);
  }
}

const doCmd = (cmd) => {
  console.log("do cmd" + cmd["cmd"]);
  let currentTime = audioContext.currentTime;
  switch(cmd["cmd"]){
    case "KICK":
      kickPlay(1);
      break;
    case "SNARE":
      snarePlay(1);
      break;
    case "HAT":
      hatPlay(1);
      break;
    case "DARKMODE":
      console.log("debug0103")
      console.log(cmd.property)
      cmdMode.DARK = cmd.property
      if(cmdMode.DARK) {
        btx.fillStyle = "rgb(0, 0, 0)";
        btx.fillRect(0,0,window.innerWidth,window.innerHeight);
        modules.erasePrint(stx, strCnvs);
        modules.textPrint(stx, strCnvs, "DARK MODE", cmdMode.DARK);
      } else {
        modules.erasePrint(btx, bckCnvs);
        modules.erasePrint(stx, strCnvs);
        modules.textPrint(stx, strCnvs, "LIGHT MODE", cmdMode.DARK);
      }
      break;
    case "WHITENOISE":
    case "NOISE":
      console.log("debug cmd")
      if(cmd.overlay === undefined || cmd.stopOther){
        oscGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01);
        cmdMode.sinewave = false
        feedbackGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01)
        cmdMode.feedback = false
      }
      if(cmdMode.whitenoise){
        cmdMode.whitenoise = false
        noiseGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01);
        modules.erasePrint(stx, strCnvs)
      } else {
        cmdMode.whitenoise = true
        noiseGain.gain.setTargetAtTime(gainVal.NOISE,currentTime,fadeVal.IN + 0.01);
        modules.erasePrint(stx, strCnvs);
        modules.erasePrint(ctx, cnvs);
        modules.textPrint(stx, strCnvs, "WHITENOISE", cmdMode.DARK);
      }
      speakVoice("NOISE")
      break;
    case "CLICK":
      modules.erasePrint(ctx, cnvs);
      console.log("debug")
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
      if(cmd.overlay === undefined || cmd.stopOther){
        feedbackGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01)
        cmdMode.feedback = false
        noiseGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01)
        cmdMode.whitenoise = false
      }
      modules.erasePrint(ctx, cnvs);
      modules.erasePrint(stx, strCnvs);
      if(cmdMode.sinewave && freqVal === cmd["property"]) {
        cmdMode.sinewave = false
        oscGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01);
      } else {
        cmdMode.sinewave = true
        modules.textPrint(stx, strCnvs, String(cmd["property"]) + "Hz", cmdMode.DARK);
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
      modules.textPrint(stx, strCnvs, String(freqVal) + "Hz", cmdMode.DARK);
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
        modules.textPrint(stx, strCnvs, String(freqVal) + "Hz", cmdMode.DARK);
        oscGain.gain.setTargetAtTime(gainVal.OSC,currentTime,fadeVal.IN + 0.01);
      }
      speakVoice(String(cmd.property)+ "Hz DOWN")
      break;
    case "TWICE":
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
      modules.textPrint(stx, strCnvs, String(freqVal) + "Hz", cmdMode.DARK);
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
      modules.textPrint(stx, strCnvs, String(freqVal) + "Hz", cmdMode.DARK);
      oscGain.gain.setTargetAtTime(gainVal.OSC,currentTime,fadeVal.IN + 0.01);
      speakVoice(String(osc.frequency.value)+ "Hz DOWN")
      break;
    case "PORTAMENT":
      modules.erasePrint(stx, strCnvs);
      modules.erasePrint(ctx, cnvs);
      modules.textPrint(stx, strCnvs, "PORTAMENT: " + String(cmd["property"]) + "SEC", cmdMode.DARK);
      oscPortament = cmd["property"];
      break;
    case "FEEDBACK":
    case "FEED":
      if(cmd.overlay === undefined || cmd.stopOther){
        oscGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01);
        cmdMode.sinewave = false
        noiseGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01)
        cmdMode.whitenoise = false
      }
      if(cmdMode.feedback) {
        cmdMode.feedback = false
        feedbackGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01);
        modules.erasePrint(stx, strCnvs);
      } else {
        cmdMode.feedback = true
        feedbackGain.gain.setTargetAtTime(gainVal.FEEDBACK,currentTime,fadeVal.IN + 0.01);
        modules.erasePrint(stx, strCnvs);
        modules.erasePrint(ctx, cnvs);
        modules.textPrint(stx, strCnvs, "FEEDBACK", cmdMode.DARK);
      }
      speakVoice(cmd.cmd)
      break;
    case "FILTER":
      let printText = filterChange();
      modules.erasePrint(stx, strCnvs);
      modules.erasePrint(ctx, cnvs);
      modules.textPrint(stx, strCnvs, "FILTER: " + String(printText) + "Hz", cmdMode.DARK);
      setTimeout(() => {
        modules.erasePrint(stx, strCnvs);
      },800);
      break;
    case "GAIN":
      modules.erasePrint(stx, strCnvs);
      modules.erasePrint(ctx, cnvs);
      modules.textPrint(stx, strCnvs, cmd["property"]["target"] + ": " + String(cmd["property"]["val"]), cmdMode.DARK);
      gainVal[cmd["property"]["target"].substr(0,cmd["property"]["target"].length - 4).toUpperCase()] = Number(cmd["property"]["val"]);
      if(eval(cmd["property"]["target"]) != undefined){ //debug later
        if(cmd.property.target != "clickGain" && (cmd.property.target === "masterGain" || eval(cmd.property.target).gain.value > 0)){
          eval(cmd.property.target).gain.setTargetAtTime(Number(cmd.property.val),currentTime,0);
        }
        console.log(eval(cmd.property.target).gain.value);
      }
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
          modules.textPrint(stx, strCnvs, "VOLUME IS FULL", cmdMode.DARK);
          setTimeout(()=>{
            modules.erasePrint(stx, strCnvs);
          }, 500);
        } else {
          masterGain.gain.setTargetAtTime(masterGain.gain.value + 0.1,currentTime,0.01)
          modules.textPrint(stx, strCnvs, "VOLUME " + cmd["property"], cmdMode.DARK);
          setTimeout(()=>{
            modules.erasePrint(stx, strCnvs);
          }, 500);
        }
      } else if(cmd["property"] === "DOWN"){
        modules.erasePrint(stx, strCnvs);
        modules.erasePrint(ctx, cnvs);
        if(masterGain.gain.value === 0){
          modules.textPrint(stx, strCnvs, "MUTED", cmdMode.DARK);
          setTimeout(()=>{
            modules.erasePrint(stx, strCnvs);
          }, 500);
        } else {
          masterGain.gain.setTargetAtTime(masterGain.gain.value - 0.1,currentTime,0.01)
          modules.textPrint(stx, strCnvs, "VOLUME " + cmd["property"], cmdMode.DARK);
          setTimeout(()=>{
            modules.erasePrint(stx, strCnvs);
          }, 500);
        }
        micLevel = 0.1 //later
      } else {
        if(isNaN(Number(cmd["property"])) === false && cmd["property"] != ""){
          masterGain.gain.setTargetAtTime(Number(cmd["property"]),currentTime,0.01)
        }
        modules.erasePrint(stx, strCnvs);
        modules.erasePrint(ctx, cnvs);
        modules.textPrint(stx, strCnvs, "VOLUME " + cmd["property"], cmdMode.DARK);
        setTimeout(()=>{
          modules.erasePrint(stx, strCnvs);
        }, 500);
      }
      prevGain = masterGain.gain.value;
      speakVoice(cmd.cmd + " " + String(cmd.property))
      break;
    case "MUTE":
      if(masterGain.gain.value > 0){
        prevGain = masterGain.gain.value;
        masterGain.gain.setValueAtTime(0,0)
        modules.erasePrint(ctx, cnvs);
        modules.erasePrint(stx, strCnvs);
        modules.textPrint(stx, strCnvs, "MUTE", cmdMode.DARK);
        setTimeout(()=>{modules.erasePrint(stx, strCnvs);},500);
      } else {
        masterGain.gain.setValueAtTime(prevGain,0)
        modules.erasePrint(stx, strCnvs);
        modules.textPrint(stx, strCnvs, "UNMUTE", cmdMode.DARK);
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
        fadeVal.IN = cmd.property.status
        fadeVal.OUT = cmd.property.status
        console.log(fadeVal)
      }
      break;
    case "SWITCH ON":
    case "SWITCH OFF":
      modules.erasePrint(ctx, cnvs);
      modules.erasePrint(stx, strCnvs);
      modules.textPrint(stx, strCnvs, cmd["cmd"], cmdMode.DARK);
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
      console.log("debug video mode:" + videoMode.mode)
      if(cmd.property != undefined) videoMode.option = cmd.property
      streamBuffer = [] //for local rec
        modules.erasePrint(ctx, cnvs);
      modules.erasePrint(stx, strCnvs);
      modules.textPrint(stx, strCnvs, "RECORD", cmdMode.DARK);
      setTimeout(() => {
        if(videoMode.mode === "record"){
          //videoMode.mode = "none";
          videoMode.mode = prevVidMode
          videoMode.option = "none"
          modules.erasePrint(stx, strCnvs);
          console.log("debug video mode:" + videoMode.mode)
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
    case "QUANTIZE":
      if(cmd.quantize){
        videoMode.option = "quantize"
        if(videoMode.mode === "chat") {
          modules.erasePrint(ctx, canvas);
          quantizePlay();
        }
      } else {
        videoMode.option = "none"
        if(videoMode.mode === "chat") {
          clearInterval(quantizeInterval)
          socket.emit('AckFromClient', "CHAT")
        }
      }
      break;
    case "LOOP":
      if(videoMode.mode === "chat"){
        if(videoMode.option != "loop"){
          if(videoMode.option === "quantize") clearInterval(quantizeInterval)
          streamBuffer = [] //for local rec
          videoMode.option = "loop"
        } else if(videoMode.option === "loop"){
          videoMode.option = "none"
          console.log(chatBuffer.target)
          console.log(playTarget)
          if(playTarget === "CHAT"){
            socket.emit('AckFromClient', "CHAT");
          } else {
            socket.emit('wavReqFromClient', playTarget);
          }
          modules.erasePrint(stx, strCnvs);
          modules.textPrint(stx, strCnvs, "UNLOOP", cmdMode.DARK);
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
      //あとで作り直し、2020/02/02
      console.log(videoMode.mode)
      if(cmd.property === "STOP"){
        stopRhythm();
      } else {
        rhythmProperty = cmd.property;
        modules.erasePrint(stx, strCnvs);
        modules.erasePrint(ctx, cnvs);
        modules.textPrint(stx, strCnvs, "BPM:" + String(Math.floor(cmd.property.bpm * 10)/10), cmdMode.DARK)
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
    case "BPM":
      cmdMode.BPM = cmd.property
      rhythmProperty.bpm = cmd.property
      rhythmProperty.interval = 60 * 1000 / rhythmProperty.bpm
      if(videoMode.mode === "chat" && videoMode.option === "quantize") {
        clearInterval(quantizeInterval)
        modules.erasePrint(ctx, canvas);
        quantizePlay()
      }
      if(cmdMode.metronome) {
        stopRhythm();
        setTimeout(()=>{
          modules.erasePrint(stx, strCnvs);
          modules.erasePrint(ctx, cnvs);
          startRhythm(rhythmProperty.interval,"CLICK");
        },rhythmProperty.interval)
      }
      if(cmdMode.BEAT) {
        clearInterval(beatInterval);
        setInterval(rhythmPattern,4*60*1000/cmdMode.BPM);
      }
      modules.textPrint(stx, strCnvs, "BPM:" + String(cmdMode.BPM), cmdMode.DARK)
      setTimeout(()=>{
        modules.erasePrint(stx, strCnvs);
      },500)
      break;
    case "RATE":
    case "SAMPLERATE":
      localSampleRate = Number(cmd.property)
      if(Number(cmd.property) > 0) {
        bufferRate = cmd.property
        modules.erasePrint(ctx, cnvs);
        modules.erasePrint(stx, strCnvs);
        modules.textPrint(stx, strCnvs, "SAMPLERATE: " + String(cmd.property) + "Hz", cmdMode.DARK)
        setTimeout(() => {
          modules.erasePrint(stx, strCnvs)
        }, 500)
      }
      break;
    case "GLITCH":
      modules.erasePrint(stx, strCnvs);
      modules.erasePrint(ctx, cnvs);
      modules.textPrint(stx,strCnvs,cmd.property, cmdMode.DARK);
      setTimeout(()=>{
        modules.erasePrint(stx, strCnvs);
      },1000)
      speakVoice(cmd.cmd)
      break;
    case "BROWSER":
      window.open('https://' + cmd.property, '_blank', 'width=' + String(window.innerWidth / 3) + ',height=' + String(window.innerHeight / 3) + ',top=' + String(window.innerWidth * Math.floor(Math.random() * 3)/3) + ',left=' + String(window.innerHeight * Math.floor(Math.random() * 3)/3));
      speakVoice(cmd.cmd)
    case "PREV":
      pastPresent(cmd["property"]);
      break;
    case "STOP":
      stop()
      videoStop()
      modules.textPrint(stx, strCnvs, "STOP", cmdMode.DARK)
      modules.erasePrint(ctx, cnvs);
      setTimeout(()=>{
        modules.erasePrint(stx, strCnvs)
        modules.erasePrint(ctx, canvas)
      }, 500);
      //speakVoice(cmd.cmd)
      break;
    case "NUMBER":
      modules.erasePrint(stx, strCnvs);
      modules.erasePrint(ctx, cnvs);
      modules.textPrint(stx, strCnvs, cmd["property"], cmdMode.DARK);
      setTimeout(()=>{
        modules.erasePrint(stx, strCnvs);
      }, 1000);
      break;
    case "SOLFAGE":
      if(!cmdMode.CHAT.BGN) {
        modules.textPrint(stx, strCnvs, "SOLFAGE", cmdMode.DARK);
        setTimeout(()=>{
          modules.erasePrint(stx, strCnvs);
        }, 500);
       /*analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048
        filter.connect(analyser);*/
        cmdMode.CHAT.BGN = true
        if(videoMode.mode != "chat" && videoMode.mode != "record") {
          //javascriptnode.onaudioprocess = onChatProcess
          //javascriptnode.connect(chatGain)
        }
      } else {
        cmdMode.CHAT.BGN = false
        let currentTime = audioContext.currentTime
        approximatelyGain.gain.setTargetAtTime(0,currentTime,0.05)
        if(videoMode.mode != "chat" && videoMode.mode != "record") {
          //javascriptnode.disconnect(masterGain);
        }
      }
      break;
    case "INSTRUCTION":
      console.log("debug: " + cmd.cmd + " " + cmd.property)
      //speakVoice(cmd.property)
      ssu.text = cmd.property;
      speechSynthesis.speak(ssu);
      modules.erasePrint(stx, strCnvs);
      modules.erasePrint(ctx, cnvs);
      modules.textPrint(stx, strCnvs, cmd.property, cmdMode.DARK);
      break;
    case "TILE":
      tileFlag = cmd.property
      break;
    case "PLAYBACK": 
      if(cmd.property != undefined && cmd.property === "local") {
        videoStop();
        videoMode.mode = "playback"
        console.log("test text")
        speakVoice(cmd.cmd)
      }
      break;
    case "VOICE":
      console.log(cmd)
      modules.erasePrint(stx, strCnvs);
      modules.erasePrint(ctx, cnvs);
      switch(cmd.property) {
        case undefined:
          voice = !voice
          modules.textPrint(stx, strCnvs, cmd.cmd + " : " +String(voice), cmdMode.DARK);
          break;
        case true:
        case false:
          voice = cmd.property
          modules.textPrint(stx, strCnvs, cmd.cmd + " : " +String(voice), cmdMode.DARK);
          break;
        case "en-US":
        case "ja-JP":
          voice = !voice
          ssu.lang = cmd.property
          modules.textPrint(stx, strCnvs, cmd.cmd + " : " + cmd.property, cmdMode.DARK);
          voice = !voice
          break;
      }
      setTimeout(() =>{
        modules.erasePrint(stx, strCnvs);
        modules.erasePrint(ctx, cnvs);
      },500)
      break;
    case "PAN":
      console.log("panning")
      console.log(cmd.property)
      let numPettern = /^[-]?([1-9]\d*|0)(\.\d+)?$/
      if(cmd.property === "L") {
        pan.setPosition(-1,0,0)
      } else if(cmd.property === "R") {
        pan.setPosition(1,0,0)
      } else if(cmd.property === "C") {
        pan.setPosition(0,0,0)
      } 
      if(numPettern.test(cmd.property)) {
        pan.setPosition(Number(cmd.property)-1,0,0)
      }
      break;
    default:
      for(let key in streamList){
        if(key === cmd["cmd"] && cmd.property != "local"){
          console.log(cmd["cmd"]);
          videoMode.mode = "chat";
          if(videoMode.option != "quantize"){
            videoMode.option = "none";
          } else {
            console.log("debuging")
            quantizePlay();
          }
          modules.erasePrint(stx, strCnvs);
          modules.erasePrint(ctx, cnvs);
          modules.textPrint(stx, strCnvs, cmd["cmd"], cmdMode.DARK);
          setTimeout(()=> {
            modules.erasePrint(stx, strCnvs);
          },800);
        }
      }
      console.log("debug CHAT")
      if(cmd.cmd != "KICK" && cmd.cmd != "SNARE" && cmd.cmd != "HAT") speakVoice(cmd.cmd)
      break;

  }
  strings = "";
  stringsClient = "";
}
  // doCmd end

const stop = () => {
  speakVoice("stop")
  console.log("stop")
  let currentTime = audioContext.currentTime
  oscGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01);
  feedbackGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01)
  noiseGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01)
  bassGain.gain.setTargetAtTime(0,currentTime,fadeVal.OUT + 0.01)
  bassFlag = false;
  cmdMode.sinewave = false
  cmdMode.whitenoise = false
  cmdMode.feedback = false
  cmdMode.CHAT.BGN = false
  modules.erasePrint(ctx, canvas);
  modules.erasePrint(stx, strCnvs);
  modules.erasePrint(ctx, canvas);
  stopRhythm();
  if(cmdMode.BEAT) {
    clearInterval(beatInterval)
    cmdMode.BEAT = false
  }
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
  if(videoMode.option === "quantize") {
    clearInterval(quantizeInterval)
  } else {
    videoMode.option = "none"
  }
}


const pastPresent = (status) =>{
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
let x = 0
let y = 0
let wdth
let hght

const playVideo = (video, source) => {
  if(!cmdMode.THREE) {
    image = new Image();
    image.src = video;
    console.log(video.length)
    image.onload = function(){
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
          let aspect = image.width / image.height
          console.log(aspect)
          if(aspect > (window.innerWidth / window.innerHeight)) {
            wdth = window.innerWidth
            hght = wdth / aspect
          } else {
            hght = window.innerHeight
            wdth = hght * aspect
          }
        x = window.innerWidth /2 - (wdth / 2)
      }
      console.log("width:" + String(wdth) + ",height:" + String(hght) + ", x:"+ x + ", y:"+ y)
      receive_ctx.drawImage(image, x, y, wdth, hght);
    }
  } else {
    reloadTexture(video);
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


const toBase64 = () =>{
  let bufferContext = buffer.getContext('2d');
  buffer.width = video.videoWidth;
  buffer.height = video.videoHeight;
  bufferContext.drawImage(video, 0, 0);
  let base64URL = buffer.toDataURL("image/jpeg")
  return base64URL
}

const keyMap = {
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
  '186' : ':',
  "190" : ".",
  "189" : "-",
  "226" : "BASS",
  "220" : "BASS",
  "191" : "/",
  "219" : "[",
  "221" : "]",
  "222" : "'",
  "187" : "BASS"
};
const shiftKeyMap = {
  '49' : '!',
  '50' : '"',
  '51' : '#',
  '52' : '$',
  '53' : '%',
  '54' : '&',
  '55' : "'",
  '56' : '(',
  '57' : ')',
  '188' : '<',
  "190" : ">",
  "189" : "=",
  "226" : "_",
  "220" : "_",
  "191" : "?",
  "219" : "{",
  "221" : "}",
  "222" : "'",
  "187" : "BASSS",
  "192" : "BASSS",
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
  '13' : 'enter',
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
  '123' : 'f12'
};

const quantizePlay = () => {
  quantizeInterval = setInterval(()=> {
    let beat = Math.random()
    if(beat < 0.125) {
      console.log(quantizeBuffer)
      if("audio" in quantizeBuffer) {
        playAudioStream(quantizeBuffer.audio,playsampleRate,1,false);
      }
      if("video" in quantizeBuffer){
        playVideo(quantizeBuffer["video"]);
      } else {
        modules.erasePrint(ctx, canvas);
        modules.textPrint(ctx, canvas, stringsClient, cmdMode.DARK);
      }
      setTimeout(()=>{
        modules.erasePrint(ctx, canvas);
        modules.erasePrint(stx, strCnvs);
      },(1000*8192)/playsampleRate)
    }
  },1000 * 15 / cmdMode.BPM)
}

const alertPlay = () => {
  let src = audioContext.createBufferSource();
  src.buffer = alertBuffer;
  src.connect(audioContext.destination);
  src.start();
}
const kickPlay = (cent) => {
  let src = audioContext.createBufferSource();
  console.log(cent)
  src.buffer = kickBuffer;
  src.playbackRate = cent;
  src.connect(chatGain);
  src.start();
}
const snarePlay = (cent) => {
  let src = audioContext.createBufferSource();
  src.buffer = snareBuffer;
  src.playbackRate = cent;
  src.connect(chatGain);
  src.start();
}
const hatPlay = (cent) => {
  let src = audioContext.createBufferSource();
  src.buffer = hatBuffer;
  src.playbackRate = cent;
  src.connect(chatGain);
  src.start();
}
const loadKick = (ctx, url) => {
  let req = new XMLHttpRequest();
  req.open("GET", url, true);
  req.responseType = "arraybuffer";
  req.onload = () => {
    if(req.response) {
      ctx.decodeAudioData(req.response).then(function(b){kickBuffer=b;},function(){});
    }
  }
  req.send();
}
const loadSnare = (ctx, url) => {
  let req = new XMLHttpRequest();
  req.open("GET", url, true);
  req.responseType = "arraybuffer";
  req.onload = () => {
    if(req.response) {
      ctx.decodeAudioData(req.response).then(function(b){snareBuffer=b;},function(){});
    }
  }
  req.send();
}
const loadHat = (ctx, url) => {
  let req = new XMLHttpRequest();
  req.open("GET", url, true);
  req.responseType = "arraybuffer";
  req.onload = () => {
    if(req.response) {
      ctx.decodeAudioData(req.response).then(function(b){hatBuffer=b;},function(){});
    }
  }
  req.send();
}

modules.textPrint(stx, strCnvs, "click screen");
