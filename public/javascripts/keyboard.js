function keyDown(e){
  var key_code = e.keyCode;
  console.log(key_code);
  var oneshotBPM = 742;

  if(key_code === 32) { //keydown space -> all stop
    console.log('stop');
    playMode = false;
    receiveMode = false;
    emit_flag = false;
    emitMode = "no_emit";
    statusEmit();
    streamBuffer = null;
    videoBuffer = null;
    streamBuffer = [];
    videoBuffer = [];
    //stopSeq(); 
  } else if(key_code === 83) { //keydown "s" -> stream start
    start();
  } else if(key_code === 82) { //keydown "r" -> receive only
    console.log('receive only');
    playMode = false;
    receiveMode = true;
    emit_flag = true;
    emitMode = "random";
    statusEmit();
  } else if(key_code === 219) { //keydown "[" -> stream all
    socket.json.emit('modeCtrl_from_client', {
      type: 'self',
      mode: true,
      target: socket.id
    });
    console.log('self true');
  } else if(key_code === 221) { //keydown "[" -> stream all
    console.log('self on');
    playMode = true;
    receiveMode = true;
    emit_flag = true;
    emitMode = "random";
    statusEmit();
    socket.json.emit('modeCtrl_from_client', {
      type: 'self',
      mode: false,
      target: socket.id
    });
    console.log('self false');
  } else if(key_code === 66) { //keydown "b" -> stream load to buffer
    console.log('sample 10 sample');
    socket.json.emit('modeCtrl_from_client', {
      type: 'buff_cli',
      mode: true
    });
  } else if(key_code === 67) { //keydown "c" -> buff clear
    console.log('buff request 3');
    socket.json.emit('modeCtrl_from_client', {
      type: 'buffClear',
      mode: true
    });
  } else if(key_code === 187 || key_code === 222) { //keydown "+" OR "^"-> sampling rate up
    if(sampleRate < 88200) {
      sampleRate = sampleRate * 2;
    }
    console.log('sampleRate:' + String(sampleRate));
  } else if(key_code === 189) { //keydown "-" -> sampling rate down
    if(sampleRate > 11025) {
      sampleRate = sampleRate / 2;
    }
    console.log('sampleRate:' + String(sampleRate));
    /*
  } else if(key_code === 222) { //keydown "^" -> bpm up
    oneshotBPM = oneshotBPM + 371;
    console.log('BPM:' + String(oneshotBPM));
  } else if(key_code === 189) { //keydown "-" -> bpm down
    if(oneshotBPM != 371){
      oneshotBPM = oneshotBPM - 371;
    }
    console.log('BPM:' + String(oneshotBPM));
    */
  } else if(key_code === 243 || key_code === 27) {
    //keydown 'esc' -> buffer clear
    console.log('clear client data');
    streamBuffer = null;
    videoBuffer = null;
    streamBuffer = [];
    videoBuffer = [];
  //数字キー
  } else if(key_code >= 48 && key_code <= 57){
    //loopShot(key_code - 48, oneshotBPM);
    faderUpDown(key_code - 48);
  }
}

$(function() {
  $(document).on('click', '#wrapper', function(){
    start();
  });
});

function faderUpDown(num) {
  var target;
  var value;
  if(num === 1) {
    console.log('stream fader 1 up');
    target = 'add_stream';
    value = 1;
  } else if(num === 2) {
    console.log('buffer fader 1 up');
    target = 'add_buff';
    value = 1;
  } else if(num === 3) {
    console.log('empty fader 1 up');
    target = 'add_empty';
    value = 1;
  } else if(num === 8) {
    console.log('stream fader 0');
    target = 'stream';
    value = 0;
  } else if(num === 9) {
    console.log('buffer fader 0');
    target = 'buff';
    value = 0;
  } else if(num === 0) {
    console.log('empty fader 0');
    target = 'empty';
    value = 0;
  }
  if(value === 0 || value ===1){
    socket.json.emit('faderCtrl_from_client', {
      target: target,
      val: value
    });
  }
}


function flagCtrl(flag) {
  if(flag) {
    flag = false;
  } else {
    flag = true;
  }
  return flag;
}

function statusEmit() {
  socket.json.emit('status_from_client', {
    type: 'trans',
    sampleRate: sampleRate,
    emitMode: emitMode,
    receiveMode: receiveMode,
    playMode: playMode
  });
}

function loopShot(time, bpm) {
  if(time > 1) {
  var clearTime = time * bpm;
    stargSeq(bpm, "oneshot");
    setTimeout(stopSec,clearTime);
  } else if(time === 0) {
    startSeq(bpm, "oneshot");
  } else {
    var oneShot = oneshotBuffer.shift();
    playAudioStream(oneShot);
    oneshotBuffer.push(oneShot);
  }
}

function start(){
  console.log('stream');
  playMode = true;
  receiveMode = true;
  emit_flag = true;
  emitMode = "random";
  statusEmit();
}

window.addEventListener("keydown", keyDown);
