function keyDown(e){
  var key_code = e.keyCode;
  //alert(key_code);
  if(key_code === 83) { //keydown "s"
    playMode = false;
    receiveMode = false;
    emit_flag = false;
    emitMode = "no_emit";
    statusEmit();
    
  } else if(key_code === 80 || key_code === 32) { //keydown "p" or space
    playMode = flagCtrl(playMode);
    statusEmit();
  } else if(key_code === 82) { //keydown "r"
    receiveMode = flagCtrl(receiveMode);
    statusEmit();
  } else if(key_code === 69) { //keydown "e"
    if(emit_flag) {
      emit_flag = false;
      emitMode = "no_emit";
    } else {
      emit_flag = true;
      emitMode = "all";
    }
    statusEmit();
  } else if(key_code === 78){
    statusEmit();
  } else if(key_code === 67){
    streamBuffer = [];
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


window.addEventListener("keydown", keyDown);
