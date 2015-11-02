var osc = audioContext.createOscillator();
var gain = audioContext.createGain();
osc.connect(gain);
gain.connect(audioContext.destination);
osc.frequency.value = 440;
gain.gain.value = 0;
osc.start(0);
var latency = 0;
socket.on('oscCtrl_from_server', function(data) {
  if(data.type === "vol") {
    gain.gain.value = data.val;
    oscVolume = data.val;
  } else if(data.type === "frq") {
    osc.frequency.setTargetAtTime(data.val, audioContext.currentTime, oscPortament);
  } else if(data.type == "prt") {
    oscPortament = data.val;
  } else if(data.type === "diff") {
    osc.frequency.setTargetAtTime(data.val, latency, latency + 0.1);
  } else if(data.type === "latency") {
    latency = data.val;
  } else if(data.type == "swt") {
    if(data.val) {
      gain.gain.value = oscVolume;
    } else {
      gain.gain.value = 0;
    }
  }
});
