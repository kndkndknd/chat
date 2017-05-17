navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;

let audioContext = new AudioContext();

// feedback
let feedbackGain = audioContext.createGain();
feedbackGain.gain.value = 0;
let filter = audioContext.createBiquadFilter();
filter.type = "highpass";
filter.frequency.value = 200;
//record/play
let javascriptnode = audioContext.createScriptProcessor(8192, 1, 1);
let streamBuffer = [];
let videoBuffer = [];
let lookBackBuffer = [];
let bufferSize = 8192;
let sampleRate = 44100;
// sinewave
let osc = audioContext.createOscillator();
let oscGain = audioContext.createGain();
osc.connect(oscGain);
oscGain.connect(audioContext.destination);
osc.frequency.value = 440;
oscGain.gain.value = 0;
osc.start(0);

let clickOsc = audioContext.createOscillator();
let clickGain = audioContext.createGain();
clickOsc.connect(clickGain);
clickGain.connect(audioContext.destination);
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
noiseGain.connect(audioContext.destination);
//whitenoiseNode.connect(audioContext.destination);
whitenoise.start(0);

// chat
chatBuffer = {};

const modList= [0.5, 0.5, 1, 18];
const chordList = [1, 4/3, 9/4, 15/8, 17/8, 7/3, 11/3];
let chordChange = 0;
let modChange = 0;

// alert sound
let alertBuffer = null;

const alertPlay = () => {
  let src = audioContext.createBufferSource();
  src.buffer = alertBuffer;
  src.connect(audioContext.destination);
  src.start();
  console.log("alert");
}
const click = () => {
  let t0 = audioContext.currentTime;
  clickGain.gain.setValueAtTime(0.7, t0);
  clickGain.gain.setTargetAtTime(0,t0,0.03);
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
loadSample(audioContext, "/sounds/alert.wav");


//video record/play ここから
let image;
let receive;
let receive_ctx;
const onAudioProcess = (e) => {
  if(videoMode === "record") {
    let input = e.inputBuffer.getChannelData(0);
    let bufferData = new Float32Array(bufferSize);
    for (let i = 0; i < bufferSize; i++) {
      bufferData[i] = input[i];
    }
    streamBuffer.push(bufferData);
    videoBuffer.push(sendVideo());
  }
  if(videoMode === "play"){
    if(streamBuffer.length > 0){
      playAudioStream(streamBuffer.shift());
      if(videoBuffer.length > 0){
        playVideo(videoBuffer.shift());
      }
    } else {
      videoMode = "none";
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }
  if(videoMode === "chat"){
    let chatInput = e.inputBuffer.getChannelData(0);
    let chatAudio = new Float32Array(bufferSize);
    for (let i = 0; i < bufferSize; i++) {
      chatAudio[i] = chatInput[i];
    }
    chatBuffer["audio"] = chatAudio;
    chatBuffer["video"] = sendVideo();
  }
  if(videoMode === "chunkEmit"){
    let input = e.inputBuffer.getChannelData(0);
    let bufferData = new Float32Array(bufferSize);
    for (let i = 0; i < bufferSize; i++) {
      bufferData[i] = input[i];
    }
    let sendChunk = {"audio":bufferData, "video": sendVideo()};
    chunkEmit(sendChunk);
    videoMode = "none";
  }
}
const playAudioStream = (flo32arr) => {
  let audio_buf = audioContext.createBuffer(1, bufferSize, sampleRate),
      audio_src = audioContext.createBufferSource();

  let audioData = audio_buf.getChannelData(0);
  for(let i = 0; i < audioData.length; i++){
    audioData[i] = flo32arr[i];
  }

  audio_src.buffer = audio_buf;
  audio_src.connect(audioContext.destination);

  audio_src.start(0);
}
//video record/play ここまで

const initialize = () =>{
  navigator.getUserMedia({ video: true, audio: {
    "mandatory": {
      "googEchoCancellation": false,
      "googAutoGainControl": false,
      "googNoiseSuppression": false,
      "googHighpassFilter": false
    },
    "optional": []
  } }, (stream) =>{
    let mediastreamsource = void 0;
    mediastreamsource = audioContext.createMediaStreamSource(stream);
    mediastreamsource.connect(javascriptnode);
    mediastreamsource.connect(filter);
    filter.connect(feedbackGain);
    //      selfGain.connect(analyser);
    feedbackGain.connect(audioContext.destination);
    //video
    video = document.getElementById('video');
    video.src = window.URL.createObjectURL(stream);
    video.play();
    video.volume = 0;
    renderStart();
  },  (e) =>{
    return console.log(e);
  });
  //rec
  javascriptnode.onaudioprocess = onAudioProcess;
  javascriptnode.connect(audioContext.destination);
  //video
  image = document.createElement("img");
  receive = document.getElementById("cnvs");
  receive_ctx = receive.getContext("2d");
};

window.addEventListener("load", initialize, false);
