navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;

var audioContext = new AudioContext();

var javascriptnode = audioContext.createScriptProcessor(8192, 1, 1);
var filter = audioContext.createBiquadFilter();
filter.type = "highpass";
filter.frequency.value = 2000;

var width = 1023;
var height = 256;

var micgain = audioContext.createGain();
micgain.gain.value = 1;
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
  audio_src.connect(micgain);
  micgain.connect(audioContext.destination);
  
  audio_src.connect(analyser);
  audio_src.start(0);
}
var jumpBit = 1;
var streamBuffer = [];
var flag = false;

function onAudioProcess(e) {
    var input = e.inputBuffer.getChannelData(0);
      if(flag) {
        var bufferData = new Float32Array(bufferSize);
        var j=1;
        
        for (var i = 0; i < bufferSize; i++) {
                bufferData[i] = input[j];
            j = j + jumpBit;
        }
        //if(emit_flag) {
        streamBuffer.push(bufferData)
      }
      if(flag){
            playAudioStream(streamBuffer.shift());
      }
        //}
        /*if(speedMode ==="slow"){
          streamBuffer = null;
          videoBuffer = null;
          streamBuffer = [];
          videoBuffer = [];
        }*/
  //$('#buffer').html(streamBuffer.length);
}

function initialize() {

  var audioElement = document.getElementById("audio");
  var frequencyElement = document.getElementById("frequency");
  var timeDomainElement = document.getElementById("timedomain");
  var frequencyContext = frequencyElement.getContext("2d");
  var timeDomainContext = timeDomainElement.getContext("2d");

  frequencyElement.width = width;
  frequencyElement.height = height;
  timeDomainElement.width = width;
  timeDomainElement.height = height;

  navigator.getUserMedia(
    {audio : true},
    function(stream) {

      var url = URL.createObjectURL(stream);
      audioElement.src = url;
      var mediastreamsource = audioContext.createMediaStreamSource(stream);
      var analyser = audioContext.createAnalyser();
      //var frequencyData = new Uint8Array(analyser.frequencyBinCount);
      //var timeDomainData = new Uint8Array(analyser.frequencyBinCount);
      mediastreamsource.connect(filter);
      filter.connect(analyser);
      filter.connect(javascriptnode);
/*
      var animation = function(){

        analyser.getByteFrequencyData(frequencyData);
        analyser.getByteTimeDomainData(timeDomainData);

        frequencyContext.clearRect(0, 0, width, height);
        frequencyContext.beginPath();
        frequencyContext.moveTo(0, height - frequencyData[0]);
        for (var i = 1, l = frequencyData.length; i < l; i++) {
          frequencyContext.lineTo(i, height - frequencyData[i]);
        }
        frequencyContext.stroke();

        timeDomainContext.clearRect(0, 0, width, height);
        timeDomainContext.beginPath();
        timeDomainContext.moveTo(0, height - timeDomainData[0]);
        for (var i = 1, l = timeDomainData.length; i < l; i++) {
          timeDomainContext.lineTo(i, height - timeDomainData[i]);
        }
        timeDomainContext.stroke();

        requestAnimationFrame(animation);

      };
*/
      //animation();

    },
    function(e) {
      console.log(e);
    }
  );
  javascriptnode.onaudioprocess = onAudioProcess;
  javascriptnode.connect(audioContext.destination);

}

window.addEventListener("load", initialize, false);
