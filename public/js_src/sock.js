socket.emit('connectFromClient', title);
/*
socket.on('connectionChkFromServer', ()=>{
  socket.emit('connectionChkFromClientt', title);
});
*/
socket.on('stringsFromServer', (data) =>{
  whitePrint();
  textPrint(data);
  if(data === "B"){
    bass();
    strings = "";
    stringsClient = "";
  }
});

socket.on('statusViewFromServer', ()=>{
  statusView();
})

socket.on('cmdFromServer', (data) => {
  doCmd(data);
})

socket.on('instructionFromServer', (data) => {
  videoStop();
  whitePrint();
  textPrint(data["text"]);
  alertPlay();
  mode = "instruction"
  setTimeout(()=>{
    whitePrint();
//    textPrint("");
  }, data["duration"])
});

socket.on('chunkFromServer', (data) => {
//  console.log(data["mode"]);
  if(videoMode === "lookback"){
    playAudioStream(data["audio"]);
    playVideo(data["video"]);
    let reqMode = "single";
    if(data["mode"] === "loop"){
      reqMode = "loop_single"
    }
    if(serverFlag){ //サーバ機のみ早すぎるため
      setTimeout(()=>{socket.emit('reqChunkFromClient',reqMode);},2000 * Math.random());
    } else {
      socket.emit('reqChunkFromClient',reqMode);
    }
  }
});

socket.on('oscFromServer',(data) => {
  let uint8arr = osc.toBuffer(data);
});

socket.on('chatFromServer', (data) => {
  if(videoMode === "chat"){
    if(data["audio"] != undefined) {
      if(data["sampleRate"] != undefined){
        sampleRate = data["sampleRate"];
      }
      playAudioStream(data["audio"]);
    }
    if(data["video"] != undefined && data["video"] != "") {
      playVideo(data["video"]);
    } else {
      whitePrint();
      textPrint(data["target"]);
    }
    switch(data["target"]){
      case "CHAT":
        socket.emit('chunkFromClient', chatBuffer);
        break;
      case "DRUM":
      case "SILENCE":
      case "PLAYBACK":
      case "TIMELAPSE":
        socket.emit('wavReqFromClient', data["target"]);
        break;
    }
  }
});
