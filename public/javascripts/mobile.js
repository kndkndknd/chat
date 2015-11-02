window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;

var socket = io.connect();

socket.json.emit('status_from_client', {
  type: 'mobile'
});
var  image = document.createElement("img");
var  receive = document.getElementById("cnvs");
var  receive_ctx = receive.getContext("2d");

var audioContext = new AudioContext();
var gain = audioContext.createGain();
if(sw) {
  gain.gain.value = 1;
} else {
  gain.gain.value = 0;
}

var streamBuffer = [];
var videoBuffer = [];

var emit_flag;
var play_flag;
var receive_flag;
var play;
var sequencer;
var playMode = false;
/*ここから音声の扱い*/
//再生の関数
function Play(){
  $('#play').hide();
  if(playMode) {
    playMode = false;
    clearInterval(sequencer);
  } else {
    playMode = true;
    play = setInterval(function(){
      if(streamBuffer.length>0) {
        playAudioStream(streamBuffer.shift());
        playVideo(videoBuffer.shift());
      }
    }, 50);
  }
}
function playAudioStream(flo32arr) {
  var audio_buf = audioContext.createBuffer(1, 8192, 22050),
      audio_src = audioContext.createBufferSource();

  var audioData = audio_buf.getChannelData(0);
  for(var i = 0; i < audioData.length; i++){
    audioData[i] = flo32arr[i];
  }

  audio_src.buffer = audio_buf;
  audio_src.connect(gain);
  gain.connect(audioContext.destination);
  audio_src.start(0);
}

socket.on('stream_from_server',function(data) {
  console.log(data.stream[0]);
  if(data.type === "stream" || data.type === "buff") {
    streamBuffer = [data.stream];
    videoBuffer = [data.video];
  }
});

socket.on('playCtrl_from_server', function(data) {
  if(data === false)
    clearInterval(sequencer);
});

socket.on('switch_from_server',function(data) {
  if(data){
    gain.gain.value = 1;
  } else {
    gain.gain.value = 0;
  }
});

socket.on('mobiCtrl_from_server', function(data){
    console.log(data);
  if(data.mode === "sw") { 
    if(data.val){
      gain.gain.value = 1;
    } else {
      clearInterval(sequencer);
      gain.gain.value = 0;
    }
  } else if(data.mode === "BPM"){
    BPM = data.val;
    if(BPM > 0) {
      sequencer = setInterval(function(){
        if(gain.gain.value === 0) {
          gain.gain.value = 1;
        } else {
          gain.gain.value = 0;
        }
      }, BPM);
    } else {
      clearInterval(sequencer);
    }
  }
});
