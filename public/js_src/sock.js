let serverFlag = false;
let standAlone = false;
let stringsClient = "";

socket.emit('infoReqFromClient');
socket.on('infoFromServer',(data) =>{
  no = data["number"];
  if(data["address"] === "192.168.0.88:8888" || data["address"] === "192.168.100.111:8888" || data["address"] === "localhost:8888"){
    serverFlag = true;
  }
})

socket.on('stringsFromServer', (data) =>{
  textPrint(data);
  if(data === "B"){
    bass();
  }
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

socket.on('chatFromServer', (data) => {
  if(videoMode === "chat" || videoMode === "stream" || videoMode === "chat_stream"){
    if(data["audio"] != undefined) {
      playAudioStream(data["audio"]);
    }
    if(data["video"] != undefined) {
      playVideo(data["video"]);
    }
    if(data["target"] === undefined){
      socket.emit('chatFromClient',chatBuffer);
//      console.log('chat');
    } else {
      textPrint(data["target"]);
      socket.emit('wavReqFromClient', data["target"]);
//      console.log('stream');
    }
  }
});

//let prevCmd = "";

const charEmit = (char) => {
  socket.emit('charFromClient', char);
}

const doCmd = (cmd) => {
  switch(cmd["cmd"]){
    case "FEEDBACK":
    case "FEED":
//      stop();
      if(feedbackGain.gain.value > 0) {
        mode = "none";
        feedbackGain.gain.value = 0;
        textPrint("");
      } else {
        mode = "feedback"
        console.log("feedback")
        feedbackGain.gain.value = 1;
        textPrint("FEEDBACK");
      }
      break;
    case "WHITENOISE":
    case "NOISE":
//      stop();
      if(noiseGain.gain.value > 0){
        mode = "none";
        noiseGain.gain.value = 0;
        textPrint("");
      } else {
        mode = "whitenoise";
        noiseGain.gain.value = 0.3;
        textPrint("WHITENOISE");
      }
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
        textPrint("");
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
        setTimeout(() => {
          textPrint("");
          socket.emit('reqChunkFromClient',"loop_all");
        },500);
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
    case "VIDEOCHAT":
    /*
      if(videoMode === "stream" || videoMode === "chat_stream"){
        videoMode = "chat_stream";
      } else {
        videoMode = "chat";
      }
      */
      videoMode = "chat";
      textPrint("VIDEO CHAT");
      setTimeout(()=> {
        chatEmit(chatBuffer);
        textPrint("");
      },800);
      break;
    case "DRUM":
    case "SILENCE":
      textPrint(cmd["cmd"]);
      setTimeout(()=> {
        wavRequest(cmd["cmd"]);
        textPrint("");
      },800);
      break;
    case "SAMPLERATE":
    case "RATE":
      sampleRateChange();
      console.log(sampleRate);
      textPrint(String(sampleRate) + "Hz");
      setTimeout(() => {
        textPrint("");
      },800);
      break;
    case "FILTER":
      let printText = filterChange();
      textPrint("FILTER: " + String(printText) + "Hz");
      setTimeout(() => {
        textPrint("");
      },800);
      break;
    case "CLICK":
      click();
      break;
    case "SINEWAVE":
      if(oscGain.gain.value > 0 && osc.frequency.value === cmd["property"]) {
        mode = "none";
        oscGain.gain.value = 0;
        textPrint("");
      } else {
        mode = "sinewave";
        chordChange = 0;
        textPrint(String(cmd["property"]) + "Hz");
        osc.frequency.value = cmd["property"];
        oscGain.gain.value = 0.5;
      }
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
      //textPrint("STOP");
      break;

  }
}

const stop = () => {
  oscGain.gain.value = 0;
  feedbackGain.gain.value = 0;
  noiseGain.gain.value = 0;
  bassGain.gain.value = 0;
  bassFlag = false;
  textPrint("");
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

const wavRequest = (data) => {
  videoMode = "chat";
  socket.emit('wavReqFromClient', data);
  console.log(data);
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
    if(e.keyCode === 188){
      if(standAlone) {
        standAlone = false;
        textPrint("network connect");
        setTimeout(()=>{
          textPrint("");
        },300);
      } else {
        standAlone = true;
        textPrint("stand alone");
        setTimeout(()=>{
          textPrint("");
        },300);
      }
    } else if(standAlone){
      let charCode = keycodeMap[String(e.keyCode)];
      if(charCode === "enter"){
        console.log(isNaN(Number(stringsClient)));
        if (isNaN(Number(stringsClient)) === false && stringsClient != "") {
          doCmd({
            "cmd":"SINEWAVE",
            "property": Number(stringsClient)
          });
          console.log("sinewave stand alone")
        } else {
          doCmd({"cmd":stringsClient});
          console.log(stringsClient + " stand alone")
        }
        stringsClient = "";
      } else if(charCode === "escape") {
        console.log("stop stand alone");
        doCmd({"cmd":"STOP"});
        stringsClient = "";
      } else if(charCode === "left_arrow" || charCode === "backspace"){
        stringsClient = "";
        textPrint("");
      } else if(e.keyCode >= 48 && e.keyCode <= 90 || e.keyCode === 190 || e.keyCode === 32){
        switch(charCode){
          case "C":
            click();
            break;
          case "B":
            bass();
            break;
          case "F":
            doCmd({"cmd":"FEEDBACK"});
            break;
          case "W":
          case "N":
            doCmd({"cmd":"WHITENOISE"})
            break;
          case "S":
            doCmd({"cmd":"SAMPLERATE"});
            break;
          default:
            stringsClient = stringsClient + charCode;
            textPrint(stringsClient);
            break;
        }
      }
    } else {
      charEmit(e.keyCode);
    }
  });
});
