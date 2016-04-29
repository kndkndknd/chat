console.log(scrnMode);
var allCtrl_flag = false;

$(function() {
  $(document).on("keydown", function(e) {
    //var key_Char = String.fromCharCode(e.which);
    console.log(e.keyCode);
    //mode change
    if(e.which === 65) { //'a' -> all switch on(in 2 seconds)
      allCtrl_flag = true;
      setTimeout(function(){
        allCtrl_flag = false;
      },2000);
    }
    if(e.which === 27 || e.which === 192) { //'esc' -> chat <-> feedback
      var setMode;
      if(mode != "chat") {
        setMode = "chat";
      } else {
        if (e.which === 27) {
          setMode = "self";
        } else if(e.which === 192) {
          setMode = "text";
        }
      }
      if(allCtrl_flag){
        socket.emit('modeCtrl_from_client', {
          type: "keyCtrl",
          mode: setMode
        });
      } else {
        modeChange(setMode);
      }
    //event
    } else if (mode === "text") {
      textMode(e.which);
    } else if (mode === "chat") {
      chatMode(e.which);
    } else if (mode === "self") {
      selfMode(e.which);
    }

    
    if(e.which === 219) { //keydown "[" -> filter frequency up
      if(filter.frequency.value < 15000){
        filter.frequency.value = filter.frequency.value + 2500;
        console.log('filter frequency' + String(filter.frequency.value));
      }
    } else if(e.which === 221) { //keydown "]" -> filter frequency down
      if(filter.frequency.value > 20){
        filter.frequency.value = filter.frequency.value - 2500;
        console.log('filter frequency' + String(filter.frequency.value));
      }
    }
  });
});
/*
function keyDown(e){
//  var key_code = e.keyCode;
  var char_code = e.charCode;
  console.log(char_code);
  //console.log(e.charCode);
  //var oneshotBPM = 742;

  //mode change
  if(char_code === 243) {
    if(mode != "chat") {
      mode = "chat";
    } else {
      mode = "feedback";
    }
  } else if(char_code === 192) {
    if(mode != "chat") {
      mode = "chat";
    } else {
      mode = "text";
    }
  //event
  } else if (mode === "text") {
    textMode(char_code);
  } else if(mode === "chat") {
    chatMode(char_code);
  } else if(mode === "feedback") {
    feedbackMode(char_code);
  }
}
*/
$(function() {
  $(document).on('click', '#wrapper', function(){
    chatMode(83);
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
  } else if(num === 4) {
    console.log('empty(client) fader 1 up');
    empty_cli = empty_cli + 1;
  } else if(num === 6) {
    console.log('empty(client) fader 1');
    empty_cli = 1;
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
    playMode: playMode,
    scrnMode: scrnMode,
    BPMMode: seqBPM,
    selector: selector,
    mobileMode: false,
    selfMode: false,
    gain: chatGain.gain.value,
    pool: poolLength
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
/*
function start(){
  console.log('stream');
  playMode = true;
  receiveMode = true;
  emit_flag = true;
  emitMode = "random";
  console.log(emitMode);
  statusEmit();
}*/
function chatMode(key_code){
  if(key_code === 32) { //keydown space -> all stop
    if(allCtrl_flag){
      socket.json.emit('modeCtrl_from_client', {
        type: 'receive',
        target: 'all',
        mode: false
      });
      socket.json.emit('modeCtrl_from_client', {
        type: 'play',
        target: 'all',
        mode: false
      });
      socket.json.emit('modeCtrl_from_client', {
        type: "emit",
        target: "all",
        mode: "no_emit"
      });
    } else {
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
    }
      //stopSeq(); 
  } else if(key_code === 83) { //keydown "s" -> stream start
    if(allCtrl_flag){
      socket.json.emit('modeCtrl_from_client', {
        type: 'receive',
        target: 'all',
        mode: true
      });
      socket.json.emit('modeCtrl_from_client', {
        type: 'play',
        target: 'all',
        mode: true
      });
      socket.json.emit('modeCtrl_from_client', {
        type: "emit",
        target: "all",
        mode: "random"
      });
    } else {
      console.log('stream');
      playMode = true;
      receiveMode = true;
      emit_flag = true;
      emitMode = "random";
      console.log(emitMode);
      statusEmit();
    //  start();
    }
  } else if(key_code === 82) { //keydown "r" -> receive only
    console.log('receive only');
    playMode = false;
    receiveMode = true;
    emit_flag = true;
    emitMode = "random";
    statusEmit();
  } else if(key_code === 77) { //keydown "s" 
    if(self_flag) {
      self_flag = false;
      console.log('self off');
    } else {
      self_flag = true;
      console.log('self on');
    }
    socket.json.emit('modeCtrl_from_client', {
      type: 'self',
      mode: self_flag,
      target: socket.id
    });

  /*
  }else if(key_code === 219) { //keydown "[" -> filter frequency up
    
    console.log('self on');
    socket.json.emit('modeCtrl_from_client', {
      type: 'self',
      mode: true,
      target: socket.id
    });
  } else if(key_code === 221) { //keydown "]" -> filter frequency down
    console.log('self off');
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
    console.log('self false');*/
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
  } else if(key_code === 86) { //keydown "v" -> stream overwrite to buffer
    socket.json.emit('modeCtrl_from_client', {
      type: 'buffClear',
      mode: true
    });
    socket.json.emit('modeCtrl_from_client', {
      type: 'buff_cli',
      mode: true
    });
  }else if(key_code === 187 || key_code === 222) { //keydown "+" OR "^"-> sampling rate up
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
  } else if(key_code === 46) {
    //keydown 'delete' -> buffer clear
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
function textMode(key_code){
  var key_char = String.fromCharCode(key_code);
  console.log(key_char);
  socket.emit('keycode_from_client', key_code);
  if(textView.length < 11) {
    textView = textView + key_char;
  } else {
    textView = textView.substr(1) + key_char;
  }
  console.log(textView);
  ctx.fillStyle = "white";
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = "black";
  ctx.font = "bold " + String(Math.floor(canvas.width * 2 / 15)) +"px 'Arial'";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(textView,(canvas.width/2),(canvas.height/2));
  ctx.restore();
}
function selfMode(key_code){
  if(key_code === 32) { //keydown space -> start/stop
    if(allCtrl_flag){
      var sendGain;
      if(selfGain.gain.value === 0) {
        sendGain = 1;
      } else {
        sendGain = 0;
      }
      socket.emit('modeCtrl_from_client', {
        type: "keyCtrl",
        mode: "self_switch",
        value: sendGain
      });
    } else {
      if(selfGain.gain.value === 0) {
        selfGain.gain.value = 1;
      } else {
        selfGain.gain.value = 0;
      }
    }
  }
}
//window.addEventListener("keydown", keyDown);
