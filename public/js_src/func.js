let serverFlag = false;
let standAlone = false;

const charEmit = (char) => {
  socket.emit('charFromClient', char);
}

const doCmd = (cmd) => {
  console.log("do cmd" + cmd["cmd"]);
  let t0 = audioContext.currentTime;
  switch(cmd["cmd"]){
    case "FEEDBACK":
    case "FEED":
//      stop();
      if(feedbackGain.gain.value > 0) {
        mode = "none";
        feedbackGain.gain.value = 0;
        whitePrint();
//        textPrint("");
      } else {
        mode = "feedback"
        console.log("feedback")
        feedbackGain.gain.value = 1;
        whitePrint();
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
        whitePrint();
        textPrint("WHITENOISE");
      }
      break;
    case "RECORD":
    case "REC":
      videoStop();
      videoMode = "record";
      whitePrint();
      textPrint("RECORD");
      setTimeout(() => {
        if(videoMode === "record"){
          videoMode = "none";
          whitePrint();
        }
      }, 5000); //時間は考え中

      break;
    case "LOOKBACK":
    case "LOOK":
      console.log("lookbak");
      stop();
      if(videoMode === "none"){
        videoMode = "lookback";
        whitePrint();
        textPrint("LOOK BACK");
        setTimeout(() => {socket.emit('reqChunkFromClient',"all");},500);
      } else {
        whitePrint();
        textPrint("ERROR");
        setTimeout(() => {
          whitePrint();
          //textPrint("");
        },1000);
      }
      break;
    case "LOOPBACK":
    case "LOOP":
      if(videoMode === "none"){
        videoMode = "lookback";
        whitePrint();
        textPrint("LOOP BACK");
        setTimeout(() => {
//          textPrint("");
          whitePrint();
          socket.emit('reqChunkFromClient',"loop_all");
        },500);
      } else {
        whitePrint();
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
        whitePrint();
        textPrint(String(osc.frequency.value) + "Hz");
      }
      break;
    case "CHORD":
      if(mode==="sinewave"){
        if(chordChange === 0){
          freqVal = osc.frequency.value * (chordList[no % chordList.length]);
//          osc.frequency.setTargetAtTime(freqVal,t0,oscPortament);
          osc.frequency.setValueAtTime(freqVal, t0+oscPortament);
//          osc.frequency.value = osc.frequency.value * (chordList[no % chordList.length]);
          chordChange = chordChange + 1;
        } else {
//          osc.frequency.value = osc.frequency.value * chordList[2];
          freqVal = osc.frequency.value * chordList[2];
          osc.frequency.setTargetAtTime(freqVal,t0,oscPortament);
        }
        modChange = 0;
        whitePrint();
        textPrint(String(osc.frequency.value) + "Hz");
      }
      break;
//    case "PREV":
//      break;
    case "STOP":
      stop();
      videoStop();
      setTimeout(()=>{
        whitePrint();
        //textPrint("");
      }, 500);
      break;
    case "CHAT":
    case "DRUM":
    case "SILENCE":
    case "TIMELAPSE":
    case "PLAYBACK":
      videoMode = "chat";
      whitePrint();
      if(cmd["cmd"] === "TIMELAPSE"){
        textPrint("PAST EVENT");
      } else {
        textPrint(cmd["cmd"]);
      }
      setTimeout(()=> {
        /*
        socket.emit('wavReqFromClient', {
          "target": "CHAT",
          "chunk": chatBuffer
        });*/
//        chunkEmit(chatBuffer);
//        chatEmit(chatBuffer);
        whitePrint();
//        textPrint("");
      },800);
      break;
      /*
    case "SAMPLERATE":
    case "RATE":
      sampleRateChange();
      console.log(sampleRate);
      whitePrint();
      textPrint(String(sampleRate) + "Hz");
      setTimeout(() => {
        whitePrint();
//        textPrint("");
      },800);
      break;
      */
    case "FILTER":
      let printText = filterChange();
      whitePrint();
      textPrint("FILTER: " + String(printText) + "Hz");
      setTimeout(() => {
        whitePrint();
//        textPrint("");
      },800);
      break;
    case "CLICK":
      click();
      break;
    case "SINEWAVE":
      whitePrint();
      if(oscGain.gain.value > 0 && osc.frequency.value === cmd["property"]) {
        mode = "none";
        oscGain.gain.value = 0;
//        textPrint("");
      } else {
        mode = "sinewave";
        chordChange = 0;
        textPrint(String(cmd["property"]) + "Hz");
//        osc.frequency.value = cmd["property"];
        console.log(t0);
        osc.frequency.setTargetAtTime(cmd["property"],t0,oscPortament);
//        osc.frequency.setValueAtTime(cmd["property"], t0+oscPortament);
        oscGain.gain.value = 0.5;
      }
      break;
    case "MUTE":
      if(muteFlag){
        masterGain.gain.value = prevGain;
        muteFlag = false;
      } else {
        prevGain = masterGain.gain.value;
        masterGain.gain.value = 0;
/*        oscGain.gain.value = 0;
        noiseGain.gain.value = 0;
        feedbackGain.gain.value = 0;
        bassGain.gain.value = 0;
        clickGain.gain.value = 0;*/

        muteFlag = true;
        whitePrint();
        textPrint("MUTE");
        setTimeout(()=>{whitePrint();},500);
      }
      break;
    case "SINEWAVE_UP":
//      osc.frequency.value = osc.frequency.value + cmd["property"];
      freqVal = osc.frequency.value + cmd["property"];
      osc.frequency.setTargetAtTime(freqVal,t0,oscPortament);
      whitePrint();
      mode = "sinewave";
      chordChange = 0;
      textPrint(String(freqVal) + "Hz");
      oscGain.gain.value = 0.5;
      break;
    case "SINEWAVE_DOWN":
      whitePrint();
      freqVal = osc.frequency.value - cmd["property"];
      if(freqVal >= 0){
        osc.frequency.setTargetAtTime(freqVal,t0,oscPortament);
        mode = "sinewave";
        chordChange = 0;
        textPrint(String(freqVal) + "Hz");
        oscGain.gain.value = 0.5;
      }
      break;
    case "PORTAMENT":
      whitePrint();
      textPrint("PORTAMENT: " + String(cmd["property"]) + "SEC");
      oscPortament = cmd["property"];
      break;
    case "VOLUME":
      if(cmd["property"] === "UP"){
        whitePrint();
        if(masterGain.gain.value === 1){
          textPrint("VOLUME IS FULL");
          setTimeout(()=>{
            whitePrint();
          }, 500);
        } else {
          masterGain.gain.value = masterGain.gain.value + 0.1;
          textPrint("VOLUME " + cmd["property"]);
          setTimeout(()=>{
            whitePrint();
          }, 500);
        }
      } else if(cmd["property"] === "DOWN"){
        whitePrint();
        if(masterGain.gain.value === 0){
          textPrint("MUTED");
          setTimeout(()=>{
            whitePrint();
          }, 500);
        } else {
          masterGain.gain.value = masterGain.gain.value - 0.1;
          textPrint("VOLUME " + cmd["property"]);
          setTimeout(()=>{
            whitePrint();
          }, 500);
        }
      } else {
        if(isNaN(Number(cmd["property"])) === false && cmd["property"] != ""){
          masterGain.gain.value = Number(cmd["property"]);
        }
        textPrint("VOLUME " + cmd["property"]);
        setTimeout(()=>{
          whitePrint();
        }, 500);
      }
      prevGain = masterGain.gain.value;
      break;
    case "SWITCH ON":
    case "SWITCH OFF":
      whitePrint();
      textPrint(cmd["cmd"]);
      setTimeout(()=>{
        whitePrint();
//        textPrint("");
      }, 1500);
      break;

    default:
      whitePrint();
      //textPrint("STOP");
      break;

  }
  strings = "";
  stringsClient = "";
}

const stop = () => {
  oscGain.gain.value = 0;
  feedbackGain.gain.value = 0;
  noiseGain.gain.value = 0;
  bassGain.gain.value = 0;
  bassFlag = false;
  whitePrint();
//  textPrint("");
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

const wavRequest = (data) => {
//  videoMode = "chat";
//  socket.emit('wavReqFromClient', {"target": data});
}

const chunkEmit = (data) => {
  socket.emit('chunkFromClient', data);
}

const statusView = () => {
  let statusText = "";
  if(oscGain.gain.value > 0){
    statusText = String(osc.frequency.value) + "Hz";
  }
  if(feedbackGain.gain.value > 0){
    if(statusText === ""){
      statusText = "FEEDBACK";
    } else {
      statusText = statusText + ", FEEDBACK"
    }
  }
  if(noiseGain.gain.value > 0){
    if(statusText === ""){
      statusText = "WHITENOISE";
    } else {
      statusText = statusText + ", WHITENOISE"
    }
  }
  if(bassFlag){
    if(statusText === ""){
      statusText = "BASS";
    } else {
      statusText = statusText + ", BASS"
    }
  }
  strings = "";
  stringsClient = "";
  console.log(statusText);
  whitePrint();
  textPrint(statusText);
}

const emitInterval = 120000;
setInterval(() => {
  if(videoMode === "none"){
    console.log("送信");
    videoMode = "chunkEmit";
  }
}, emitInterval);
