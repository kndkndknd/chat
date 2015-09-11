//var socket = io.connect();
var myid = socket.id;


/*socket.ioによるステータス操作*/

//statusEmit();

socket.json.emit('status_from_client', {
  type: 'trans',
  sampleRate: sampleRate,
  emitMode: emitMode,
  receiveMode: receiveMode,
  playMode: playMode,
  serverMode: false
});

socket.on('status_from_server_id', function(data) {
  myid = data;
});

socket.on('emitCtrl_from_server', function(data) {
//  alert(data);
  emitMode = data;
  $('#emitmode').val(emitMode);
  if(data === "no_emit"){
    emit_flag = false;
  } else {
    emit_flag = true;
  }
});

socket.on('receiveCtrl_from_server', function(data) {
  receiveMode = data;
});
socket.on('playCtrl_from_server', function(data) {
  playMode = data;
});
socket.on('serverCtrl_from_server',function(data) {
  serverMode = data;
});

socket.on('rateCtrl_from_server', function(data) {
  sampleRate = data;
});
socket.on('buffCtrl_from_server', function(data) {
  bufferSize = data;
});

socket.on('stream_from_server',function(data) {
  if(receiveMode) {
    streamBuffer.push(data.stream);
  }
});

socket.on('clear_from_server', function(data) {
  if(data.type === "all"){
    streamBuffer=  [];
    emit_flag = false;
    receiveMode = false;
    playMode = false;
  } else if(data.type === "buff") {
    streamBuffer = [];
  }
  socket.json.emit('debugCtrl_from_client', {
    type: "result",
    id: myid,
    result: data.type
  });
});

socket.on('oneshotCtrl_from_server', function(data) {
  if(data.type === 'load') {
    oneshotBuff = data.loadBuff;
    socket.emit('oneshotCtrl_from_client', {
      type: "notice_load"
    });
  } else if(data.type === 'trig') {
    shot = oneshotBuff.shift();
    playAudioStream(shot);
    oneshotBuff.push(shot);
  }
});
function emitStream(bufferData, emitMode) {
  //$("#print").html(emitMode);
  socket.json.emit('stream_from_client',{
    stream: bufferData,
    emitMode: emitMode
  });
}
