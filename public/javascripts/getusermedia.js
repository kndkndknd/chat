navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;


var audioContext = new AudioContext();
var analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.9;
$('#buff_size').val(bufferSize);
$('#samp_rate').val(sampleRate);
$('#jump').val(jumpBit);
$('#emitmode').val(emitMode);
$('#receivemode').val(receiveMode);

var streamBuffer = [];
var videoBuffer = [];
var mic_flag = true;
var rec_flag = false;
var recorder = null;
var serverMode = false;

var self_flag = false;

var emit_flag;
var play_flag;
var receive_flag;


if(emitMode != "no_emit") {
  emit_flag = true;
} else {
  emit_flag = false;
}

/*ここから音声の扱い*/
//再生の関数
function playAudioStream(flo32arr) {
  var audio_buf = audioContext.createBuffer(1, bufferSize, sampleRate),
      audio_src = audioContext.createBufferSource();
  var current_time = audioContext.currentTime;

  var audioData = audio_buf.getChannelData(0);
  for(var i = 0; i < audioData.length; i++){
    audioData[i] = flo32arr[i];
  }

  audio_src.buffer = audio_buf;
  audio_src.connect(audioContext.destination);
  
  audio_src.connect(analyser);
  if(scrnMode === "video" || scrnMode === "flash"){
    if(videoBuffer != [])
      playVideo(videoBuffer.shift());
  }else{
    onScreenProcess();
  }
  audio_src.start(0);
}


function onAudioProcess(e) {
    var input = e.inputBuffer.getChannelData(0);

    if(self_flag) {
      playAudioStream(input);
    }else{
      var bufferData = new Float32Array(bufferSize);
      var j=0;
      
      for (var i = 0; i < bufferSize; i++) {
	      bufferData[i] = input[j];
          j = j + jumpBit;
      }
      if(emit_flag) {
        if(scrnMode){
          var emitVideo = sendVideo();
          emitStream(bufferData, emitMode, emitVideo);
        } else {
          emitStream(bufferData, emitMode, "");
        }
      }
      if(playMode && seqBPM === 0 && streamBuffer != []){
        if(speedMode === "fast"){
          if(Math.random()<0.4)
            playAudioStream(streamBuffer.shift());
        } else {
          playAudioStream(streamBuffer.shift());
        }
        if(speedMode ==="slow"){
          streamBuffer = [];
          videoBuffer = [];
        }
      }
    }

}

function initialize() {
  var javascriptnode = audioContext.createScriptProcessor(8192, 1, 1);

	navigator.getUserMedia(
		{video : true, audio : true},
		function(stream) {
		  var mediastreamsource;
			mediastreamsource = audioContext.createMediaStreamSource(stream);
    	mediastreamsource.connect(javascriptnode);
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
}

window.addEventListener("load", initialize, false);

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
  redraw(data[148],data[102],data[44]);
}

var sequencer;
function startSeq(bpm){
  sequencer = setInterval(function(){
    playAudioStream(streamBuffer.shift());
  }, bpm);
  console.log(sequencer);
}
function stopSeq(){
  clearInterval(sequencer);
  console.log(sequencer);
  streamBuffer = [];
  videoBuffer = [];
}

