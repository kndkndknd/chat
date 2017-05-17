let serverFlag = false;
socket.emit('infoReqFromClient');
socket.on('infoFromServer',(data) =>{
  no = data["number"];
  if(data["address"] === "192.168.0.88:8888" || data["address"] === "192.168.100.111:8888" || data["address"] === "localhost:8888"){
    serverFlag = true;
  }
})

socket.on('stringsFromServer', (data) =>{
  textPrint(data);
});

socket.on('cmdFromServer', (data) => {
  doCmd(data);
})

socket.on('instructionFromServer', (data) => {
  videoStop();
  textPrint(data["text"]);
  alertPlay();
  mode = "instruction"
  setTimeout(()=>{
    textPrint("");
  }, data["duration"])
});

socket.on('chunkFromServer', (data) => {
  console.log(data["mode"]);
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

socket.on('chatFromServer', (data) => {
  if(videoMode === "chat"){
    if(data != {}){
      playAudioStream(data["audio"]);
      playVideo(data["video"]);
    }
      socket.emit('chatFromClient',chatBuffer);
//    }
  }
});


const charEmit = (char) => {
  socket.emit('charFromClient', char);
}

const doCmd = (cmd) => {
  switch(cmd["cmd"]){
    case "FEEDBACK":
    case "FEED":
      stop();
      mode = "feedback"
      console.log("feedback")
      feedbackGain.gain.value = 1;
      textPrint("FEEDBACK");
      break;
    case "WHITENOISE":
    case "NOISE":
      stop();
      mode = "whitenoise";
      noiseGain.gain.value = 0.3;
      textPrint("WHITENOISE");
      break;
    case "RECORD":
    case "REC":
      videoStop();
      videoMode = "record";
      textPrint("RECORD");
      setTimeout(() => {
        videoMode = "none";
        textPrint("");
      }, 15000); //時間は考え中
      break;
    case "PLAYBACK":
    case "PLAY":
      stop();
      videoStop();
      textPrint("PLAYBACK");
      setTimeout(() => {
        videoMode = "play";
        console.log("playback")
      },800);
      break;
    case "LOOKBACK":
    case "LOOK":
      console.log("lookbak");
      stop();
      if(videoMode === "none"){
        videoMode = "lookback";
        textPrint("LOOK BACK");
        setTimeout(() => {socket.emit('reqChunkFromClient',"all");},500);
      } else {
        textPrint("ERROR");
        setTimeout(() => {textPrint("");},1000);
      }
      break;
    case "LOOPBACK":
    case "LOOP":
      if(videoMode === "none"){
        videoMode = "lookback";
        textPrint("LOOP BACK");
        setTimeout(() => {socket.emit('reqChunkFromClient',"loop_all");},500);
      } else {
        textPrint("ERROR");
        setTimeout(() => {textPrint("");},1000);
      }
      break;
    case "MODULATION":
    case "MOD":
      if(mode==="sinewave"){
        osc.frequency.value = osc.frequency.value + (no * modList[(modChange % modList.length)]);
        modChange = modChange + 1;
        chordChange = 0;
        textPrint(String(osc.frequency.value) + "Hz");
      }
      break;
    case "CHORD":
      if(mode==="sinewave"){
        if(chordChange === 0){
          osc.frequency.value = osc.frequency.value * (chordList[no % chordList.length]);
          chordChange = chordChange + 1;
        } else {
          osc.frequency.value = osc.frequency.value * chordList[2];
        }
        modChange = 0;
        textPrint(String(osc.frequency.value) + "Hz");
      }
      break;
//    case "PREV":
//      break;
    case "STOP":
      stop();
      videoStop();
      setTimeout(()=>{
        textPrint("");
      }, 500);
      break;
    case "CHAT":
      videoMode = "chat";
      textPrint("VIDEO CHAT");
      setTimeout(()=> {
        chatEmit(chatBuffer);
        textPrint("")
      },800);
      break;
    case "CLICK":
      click();
      break;
    case "SINEWAVE":
      stop();
      mode = "sinewave";
      chordChange = 0;
      textPrint(String(cmd["property"]) + "Hz");
      osc.frequency.value = cmd["property"];
      oscGain.gain.value = 0.5;
      break;
    case "SWITCH ON":
    case "SWITCH OFF":
      textPrint(cmd["cmd"]);
      setTimeout(()=>{
        textPrint("");
      }, 1500);
      break;

    default:
      strings = "";
      break;

  }
}

const stop = () => {
  switch (mode) {
    case "sinewave":
      oscGain.gain.value = 0;
      break;
    case "feedback":
      feedbackGain.gain.value = 0;
      break;
    case "whitenoise":
      noiseGain.gain.value = 0;
      break;
  }
  mode = "none";
  textPrint("STOP");
}

const videoStop = () => {
  switch (videoMode) {
    case "chunkEmit":
      break;
    default:
      videoMode = "none";
      break;
  }
}

const chatEmit = (data) => {
  socket.emit('chatFromClient', data);
  console.log("chat emit");
}

const chunkEmit = (data) => {
  socket.emit('chunkFromClient', data);
}

const emitInterval = 15000;
setInterval(() => {
  if(videoMode === "none"){
    videoMode = "chunkEmit";
  }
}, emitInterval);

$(() =>{
  $(document).on("keydown", (e)=> {
    charEmit(e.keyCode);
  });
});
