navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;


var audioContext = new AudioContext();
var chatGain = audioContext.createGain();
chatGain.gain.value = 1;
var selfGain = audioContext.createGain();
selfGain.gain.value = 0;
var analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.9;
var analyserSelf = audioContext.createAnalyser();
var timeDomainData = new Uint8Array(analyserSelf.frequencyBinCount);
console.log(timeDomainData.length);
console.log(canvas.width);
$('#buff_size').val(bufferSize);
$('#samp_rate').val(sampleRate);
$('#jump').val(jumpBit);
$('#emitmode').val(emitMode);
$('#receivemode').val(receiveMode);


var streamBuffer = [];
var videoBuffer = [];
var oneshotBuffer = [];
var mic_flag = true;
var rec_flag = false;
var recorder = null;
var serverMode = false;

var self_flag = false;

var emit_flag;
var play_flag;
var receive_flag;
var javascriptnode = audioContext.createScriptProcessor(8192, 1, 1);
var filter = audioContext.createBiquadFilter();
filter.type = "highpass";
filter.frequency.value = 20;

if(emitMode != "no_emit") {
  emit_flag = true;
} else {
  emit_flag = false;
}
var wavExported = function(blob) {
  var url = URL.createObjectURL(blob);
  var date = new Date();
  var fname =  date.toISOString() + '.wav';

  $('#url').append('<li>' +
          fname +  
          ' <a href="' + url + '" download="' + fname + '">dl</a>' +
          '</li>');
  recorder.clear();
}

function onScreenProcess() {
  var data = new Uint8Array(256);
  analyser.getByteFrequencyData(data);
  //console.log(data);
  redraw(data[148],data[102],data[44]);
}

var sequencer;
function startSeq(bpm,type){
  if(type === "stream"){
    sequencer = setInterval(function(){
      playAudioStream(streamBuffer.shift());
    }, bpm);
  } else {
    sequencer = setInterval(function(){
      var oneShot = oneshotBuffer.shift();
      playAudioStream(oneShot);
      oneshotBuffer.push(oneShot);
    }, bpm);
  }

  console.log(sequencer);
  /*
  var deleteNum = Math.floor(bpm/(bufferSize/sampleRate)) - 1;
  console.log(deleteNum);
  streamBuffer.splice(0,deleteNum);
  videoBuffer.splice(0,deleteNum);
  */
}
function stopSeq(){
  clearInterval(sequencer);
  console.log(sequencer);
  streamBuffer = [];
  videoBuffer = [];
}
/*
function reLoad() {
  location.reload();
}*/

/*ここから音声の扱い*/
//再生の関数
function playAudioStream(flo32arr) {
  var audio_buf = audioContext.createBuffer(1, bufferSize, sampleRate),
      audio_src = audioContext.createBufferSource();
  var current_time = audioContext.currentTime; //異常あればはずす

  var audioData = audio_buf.getChannelData(0);
  //if(typeof flo32arr != "undefined"){
  //if(flo32arr){
  for(var i = 0; i < audioData.length; i++){
    audioData[i] = flo32arr[i];
  //}
  }

  audio_src.buffer = audio_buf;
  audio_src.connect(chatGain);
  chatGain.connect(audioContext.destination);
  //audio_src.connect(audioContext.destination);
  
  audio_src.connect(analyser);
  if(scrnMode === "video" || scrnMode === "flash"){
    if(videoBuffer.length > 0){
      playVideo(videoBuffer.shift());
    }
  }else{
    onScreenProcess();
  }
  //sendVideo();
  audio_src.start(0);
}


function onAudioProcess(e) {
    var input = e.inputBuffer.getChannelData(0);
      if(emit_flag) {
      //}else{
        var bufferData = new Float32Array(bufferSize);
        var j=0;
        
        for (var i = 0; i < bufferSize; i++) {
                bufferData[i] = input[j];
            j = j + jumpBit;
        }
        //if(emit_flag) {
          if(scrnMode){
            var emitVideo = sendVideo();
            emitStream(bufferData, emitMode, emitVideo);
          } else {
            emitStream(bufferData, emitMode, "");
          }
      }
      if(playMode && seqBPM === 0 && streamBuffer.length > 0){
          if(poolLength > 0 && streamBuffer.length >= poolLength){
            console.log('release');
            releasePool();
            poolTimer = setInterval(releasePool(),5000);
            setTimeout(restartPool(),25000);
          } else if(poolLength < 1){
            if(Math.random() < (1/empty_cli)){
              playAudioStream(streamBuffer.shift());
            } else {
              playAudioStream(new Float32Array(8192));
            }
          } else {
            console.log(streamBuffer.length);
          }
      }
}
var poolTimer;

function releasePool(){
  console.log('int');
}
function restartPool(){
  console.log('stop');
  clearInterval(poolTimer);
}

function initialize() {
//  var javascriptnode = audioContext.createScriptProcessor(8192, 1, 1);
  var audioElement = document.getElementById("audio");

  navigator.getUserMedia(
    {video : true, audio : true},
    function(stream) {
      //var url = URL.createObjectURL(stream);
      //audioElement.src = url;
      var mediastreamsource;
      mediastreamsource = audioContext.createMediaStreamSource(stream);
      //mediastreamsource.connect(javascriptnode);
      mediastreamsource.connect(filter);
      filter.connect(selfGain);
//      selfGain.connect(analyser);
      selfGain.connect(audioContext.destination);
      filter.connect(javascriptnode);
      //filter.connect(analyserSelf);
      filter.connect(analyser);

      //  recorder = new Recorder(mediastreamsource, { workerPath: '/javascripts/Recorderjs/recorderWorker.js' });
      //
      //video
      video = document.getElementById('video');
      video.src = window.URL.createObjectURL(stream);
      video.play();
      video.volume = 0;
      renderStart();
    },
    function(e) {
      console.log(e);
    }
  );
  javascriptnode.onaudioprocess = onAudioProcess;
  javascriptnode.connect(audioContext.destination);
  //video
  image = document.createElement("img");
  receive = document.getElementById("cnvs");
  receive_ctx = receive.getContext("2d");
  //setInterval('reLoad()',initReload * 1000);
}

window.addEventListener("load", initialize, false);
