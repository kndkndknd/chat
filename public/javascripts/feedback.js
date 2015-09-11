navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;

var socket = io.connect();
var audioElement = document.getElementById("audio");
var played = false;
var audioContext = new AudioContext();

socket.emit('status_from_client', 'feedback');

$('#stop').click(function(e) {
  e.preventDefault();
      //audioElement.volume=0;
  socket.emit('feedback_from_client',{
    target: socket.id,
    signal: "off"
  });
});

$('#start').click(function(e) {
    e.preventDefault();
      //audioElement.volume=1;
  socket.emit('feedback_from_client',{
    target: socket.id,
    signal: "on"
  });
});
/*
*/
function initialize() {

	navigator.getUserMedia(
		{audio : true},
		function(stream) {

			var url = URL.createObjectURL(stream);
			audioElement.src = url;
			var mediastreamsource = audioContext.createMediaStreamSource(stream);
      audioElement.volume=0;
		},
		function(e) {
			console.log(e);
		}
	);

}

window.addEventListener("load", initialize, false);


socket.on('feedback_from_server', function(data) {
  if (data.switcher == "on") {
    audioElement.volume=data.volume;
    if(data.timer > 0) {
      setTimeout(function() {
        audioElement.volume=0;
      }, data.timer);
    }
  } else {
    audioElement.volume=0;
  }
});

