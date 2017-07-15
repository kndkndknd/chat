navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;

let audioContext = new AudioContext();
let masterGain = audioContext.createGain();
masterGain.gain.value = 0.7;
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
let videoBuffer = [];
let lookBackBuffer = [];
let bufferSize = 8192;
let sampleRate = 44100;
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

// chat
chatBuffer = {};
//let chatGain = audioContext.createGain();
//chatGain.gain.value = 1;
// chatGain.connect(audioContext.destination);



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
  console.log("alert");
}
const click = () => {
  textPrint("CLICK")
  let t0 = audioContext.currentTime;
//  clickGain.gain.value = 0.7;
  clickGain.gain.setValueAtTime(0.7, t0);
  clickGain.gain.setTargetAtTime(0,t0,0.03);
  setTimeout(()=>{
    textPrint("");
  },300);
//  setTimeout(()=>{
//    clickGain.gain.value = 0;
//    let t1 = audioContext.currentTime;
//    clickGain.gain.setTargetAtTime(0, t1, t1+25);
//  }, 20)
  //clickGain.gain.setValueAtTime(0, t0+30);
//  clickGain.gain.linearRampToValueAtTime(0, t0+30);
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
    whitePrint();
  } else {
    bassOsc.frequency.value = bassLine[Math.floor(bassLine.length * Math.random())];
    bassGain.gain.value = 0.7;
    whitePrint();
    textPrint("BASS");
    bassFlag = true;
  }
}

const sampleRateChange = () =>{
  switch(sampleRate){
    case 22050:
      sampleRate = 44100;
      break;
    case 44100:
      sampleRate = 88200;
      break;
    case 88200:
      sampleRate = 11025;
      break;
    case 11025:
      sampleRate = 22050;
      break;
    default:
      sampleRate = 22050;
      break;
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

//    streamBuffer.push(bufferData);
//    videoBuffer.push(sendVideo());
  /*
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
  */
  if(videoMode != "none"){
    /*
    let input = e.inputBuffer.getChannelData(0); //copyFromchannelの可否確認
    let bufferData = new Float32Array(bufferSize);
    for (let i=0; i<bufferSize; i++ ){
      bufferData[i] = input[i];
    }
    */
    let bufferData = new Float32Array(bufferSize);
    e.inputBuffer.copyFromChannel(bufferData, 0);
//    console.log(buffer8Data[1000]);
    if(videoMode === "record") {
//      chunkEmit({"audio":buffer8Data, "video":sendVideo(), "target": "PLAYBACK"});
        chunkEmit({"audio":bufferData, "video":sendVideo(), "target": "PLAYBACK"});
    }
    if(videoMode === "chat"){
//      chatBuffer["audio"] = buffer8Data;
      chatBuffer["audio"] = bufferData;
      chatBuffer["video"] = sendVideo();
      chatBuffer["target"] = "CHAT";
    }
    if(videoMode === "chunkEmit"){
//      let sendChunk = {"audio":buffer8Data, "video": sendVideo(), "target": "timelapse"};
      let sendChunk = {"audio":bufferData, "video": sendVideo(), "target": "timelapse"};
      chunkEmit(sendChunk);
      videoMode = "none";
    }
  }
}
const playAudioStream = (flo32arr) => {
//const playAudioStream = (int8arr) => {
  let audio_buf = audioContext.createBuffer(1, bufferSize, sampleRate),
      audio_src = audioContext.createBufferSource();
//  let audioData = audio_buf.getChannelData(0);
//  for(let i = 0; i < audioData.length; i++){
//    audioData[i] = flo32arr[i];
//  }
//  let audioData = new Float32Array.from(flo32arr);
//  console.log(flo32arr);
  let audioData = new Float32Array(bufferSize);
  for(let i = 0; i < audioData.length; i++){
    audioData[i] = flo32arr[i];
  }
  audio_buf.copyToChannel(audioData, 0);
  console.log(audio_buf);
  audio_src.buffer = audio_buf;
//  audio_src.connect(audioContext.destination);
  audio_src.connect(masterGain);
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
  //rec
  javascriptnode.onaudioprocess = onAudioProcess;
  javascriptnode.connect(audioContext.destination);
  //video
  image = document.createElement("img");
  receive = document.getElementById("cnvs");
  receive_ctx = receive.getContext("2d");
};

window.addEventListener("load", initialize, false);
