window.URL = window.URL || window.webkitURL;
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || 
                         navigator.mozGetUserMedia || navigator.msGetUserMedia;
window.AudioContext = window.AudioContext || window.webkitAudioContext;

var socket = io.connect();

var audioContext = null;
var lowpassFilter = null;
var sampleRate = 0;
var recorder = null;
var cFlag = false;

var appInit = function() {
audioContext = new AudioContext();
    sampleRate = audioContext.sampleRate;
console.log("sample rate:" + sampleRate);

lowpassFilter = audioContext.createBiquadFilter();
    lowpassFilter.type = 0;
    lowpassFilter.frequency.value = 20000;

if (!navigator.getUserMedia) {
  alert("WebRTC(getUserMedia) is not supported.");
  return;
}

navigator.getUserMedia({video: false, audio: true}, function(stream) {
  var input = audioContext.createMediaStreamSource(stream);

  input.connect(lowpassFilter);

  recorder = new Recorder(lowpassFilter, { workerPath: '/javascripts/Recorderjs/recorderWorker.js' });
  $('#captureButton').removeAttr('disabled');
    }, function() {
  alert("Mic access error!");
  return;
    });
}

var viewTimer;

var captureStart = function() {
  if (cFlag) { // already started.
    return;
  }

  cFlag = true;

  recorder && recorder.record();

  $('#status').html("0");
  viewTimer = setInterval("statusView()",1000);
}
var captureStop = function() {
  if (!cFlag) { // already stopped.
    return;
  }
  cFlag = false;

  recorder && recorder.stop();
  recorder && recorder.exportWAV(wavExported);
  clearInterval(viewTimer);
  $('#status').html("");
}

var wavExported = function(blob) {
  var url = URL.createObjectURL(blob);
  var date = new Date();
  var fname =  'buff.wav';
  $('#debug').html(url);
  var send = '<li>recorder<a href="' + url + '" download="' + fname + '">dl</a></li>';
  $('#timeline').append('<li>' +
          fname +  
          ' <a href="' + url + '" download="' + fname + '">dl</a>' +
          '</li>');
  recorder.clear();
  socket.json.emit('recordedURL_from_client', send);

}

var statusView = function(){
  var i = Number($('#status').html());
  $('#status').html(i+1);
}



$(document).ready(function() {
var ua = navigator.userAgent;
  $(function() {
    $(document).on('click', '#one', function(){
      captureStart();
    });
  });
  $(function() {
    $(document).on('click', '#two', function(){
      captureStop();
    });
  });

  appInit();
});

socket.on('recorderCtrl_form_server', function(data) {
  if(data) {
    captureStart();
  } else {
    captureStop();
    socket.emit('recordedURL_from_server', $('#debug').html());
  }
});

