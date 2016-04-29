//var socket = io.connect();
var myid = socket.id;

//tmp
var selector = {"stream":true, "buff":true, "1":true, "2":true, "3":true, "4":true};
var oneshotBuff = [];

/*socket.ioによるステータス操作*/

//statusEmit();

console.log(chatGain.gain.value);
socket.json.emit('status_from_client', {
  type: 'trans',
  sampleRate: sampleRate,
  emitMode: emitMode,
  receiveMode: receiveMode,
  playMode: playMode,
 // spedMode: speedMode,
  scrnMode: scrnMode,
  BPMMode: seqBPM,
  selector: selector,
  mobileMode: false,
  selfMode: false,
  gain: chatGain.gain.value,
  pool: poolLength
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
  
  if(receiveMode === false) {
    streamBuffer = [];
    videoBuffer = [];
  }
    
});
socket.on('playCtrl_from_server', function(data) {
  playMode = data;
  if(seqBPM > 0){
    if(data){
      startSeq(seqBPM, "stream");
    } else {
      stopSeq();
    }
  }
});
socket.on('speedCtrl_from_server',function(data) {
  console.log(data);
  speedMode = data;
});

socket.on('rateCtrl_from_server', function(data) {
  sampleRate = data;
  decay = Math.floor((1000*bufferSize)/sampleRate);
});
socket.on('buffCtrl_from_server', function(data) {
  bufferSize = data;
  decay = Math.floor((1000*bufferSize)/sampleRate);
});

socket.on('stream_from_server',function(data) {
//  console.log(data.type);
  //if(receiveMode && selector[String(data.type)]) {
  if(receiveMode && selector[data.type]) {
  //if(receiveMode) {
    //console.log(data.stream[0]);
    streamBuffer.push(data.stream);
    videoBuffer.push(data.video);
  }
  //if(data.video != "none") {
  //}
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

socket.on('scrnCtrl_from_server', function(data) {
  videoBuffer = [];
  scrnMode = data;
});

socket.on('gainCtrl_from_server', function(data) {
  //console.log(data);
  chatGain.gain.value = data;
  console.log('chatGain value: ' + String(chatGain.gain.value));
});

socket.on('poolCtrl_from_server', function(data) {
  console.log('pool');
  poolLength = data.val;
});
socket.on('muteCtrl_from_server', function(data) {
  console.log('mute ' + data.val + ":" + data.mode);
  selector[data.val] = data.mode;
});

socket.on('BPMCtrl_from_server', function(data){
  console.log(data);
  if(playMode){
    if(seqBPM>0)
      stopSeq();
    if(data>0){
      startSeq(data, "stream");
    } else {
      stopSeq();
    }
  }
  seqBPM = data;
});

socket.on('buffRtn_from_server', function(data){
  oneshotBuffer = null;
  oneshotBuffer = data;
});

socket.on('modeCtrl_from_server', function(data){
  console.log('mode:' + String(data));
  modeChange(data);
});
socket.on('selfCtrl_from_server', function(data){
  if(mode === "self") {
    selfGain.gain.value = data;
  }
});

socket.on('speak_from_server', function(data){
  var pitchval = Math.floor(100 * Math.random());
  console.log("speak " + data, {pitch: pitchval});
  speak(data);
  ctx.fillStyle = "white";
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = "black";
  ctx.font = "bold " + String(Math.floor(canvas.width * 4 / (3 * data.length))) +"px 'Arial'";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(data,(canvas.width/2),(canvas.height/2));
  ctx.restore();
  setTimeout(function(){
    ctx.fillStyle = "white";
    ctx.fillRect(0,0,canvas.width,canvas.height); 
  },500);
});

function emitStream(bufferData, emitMode, video) {
  //$("#print").html(emitMode);
  socket.json.emit('stream_from_client',{
    stream: bufferData,
    emitMode: emitMode,
    video: video
  });
}

function buffRequest(bufftarget,length) {
  socket.json.emit('buffReq_from_client',{
    target: bufftarget,
    length: length
  });
}
function modeChange(data) {
  if(data === "chat"){
    cancelAnimationFrame(animation);
    ctx.fillStyle = "black";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    mode = "chat";
    selfGain.gain.value = 0;
    playMode = true;
    receiveMode = true;
    emit_flag = true;
    emitMode = "random";
  } else if(data === "self") {
    mode = "self";
    selfGain.gain.value = 1;
    filter.frequency.value = 5000;
    playMode = false;
    receiveMode = false;
    emit_flag = false;
    emitMode = "no_emit";
    streamBuffer = null;
    videoBuffer = null;
    streamBuffer = [];
    videoBuffer = [];
    animationSelf();
  } else if(data === "text") {
    ctx.fillStyle = "white";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    mode = "text";
    selfGain.gain.value = 0;
    playMode = false;
    receiveMode = false;
    emit_flag = false;
    emitMode = "no_emit";
    streamBuffer = null;
    videoBuffer = null;
    streamBuffer = [];
    videoBuffer = [];
  }
}
