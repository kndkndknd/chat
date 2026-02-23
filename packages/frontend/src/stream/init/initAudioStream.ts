import {
  contextState,
  scriptProcessorState,
  gainState,
  otherNodeState,
  flagState,
  socketState,
  oscState,
  timelapseState,
} from "../../state";
import { textPrint, erasePrint, toBase64 } from "../../canvasEvent";
import { time } from "node:console";

export const initAudioStream = (stream) => {
  let mediastreamsource: MediaStreamAudioSourceNode;
  mediastreamsource = contextState.audioContext.createMediaStreamSource(stream);
  mediastreamsource.connect(scriptProcessorState.javascriptnode);
  mediastreamsource.connect(gainState.feedbackGain);
  mediastreamsource.connect(gainState.feedbackReverveGain);
  gainState.feedbackGain.connect(gainState.masterGain);
  scriptProcessorState.javascriptnode.onaudioprocess = onAudioProcess;
  scriptProcessorState.javascriptnode.connect(gainState.masterGain);
  //rec

  //SIMULATE
  otherNodeState.analyser = contextState.audioContext.createAnalyser();
  mediastreamsource.connect(otherNodeState.simFilter);
  otherNodeState.simFilter.connect(otherNodeState.analyser);
};

const onAudioProcess = (e: AudioProcessingEvent) => {
  const bufferSize = 8192;
  if (flagState.chatFlag) {
    let bufferData = {
      source: "CHAT",
      video: toBase64(),
      audio: new Float32Array(bufferSize),
      bufferSize: bufferSize,
      duration: e.inputBuffer.duration,
    };
    e.inputBuffer.copyFromChannel(bufferData.audio, 0);
    // console.log(bufferData.audio)
    // console.log("socket.id(chatFromClient)", socket.id);
    if (flagState.socketId !== "") {
      bufferData["from"] = flagState.socketId;
    }
    socketState.socket.emit("chatFromClient", bufferData);
    console.log("chatFromClient emit");
    flagState.chatFlag = false;
  }
  if (flagState.recordFlag) {
    // console.log("record");
    let bufferData = {
      source: "PLAYBACK",
      video: toBase64(),
      audio: new Float32Array(bufferSize),
      bufferSize: bufferSize,
      duration: e.inputBuffer.duration,
    };
    e.inputBuffer.copyFromChannel(bufferData.audio, 0);
    // console.log(bufferData);
    socketState.socket.emit("chatFromClient", bufferData);
  }
  if (flagState.otherStreamFlag !== "") {
    // console.log(frontState.otherStreamFlag);
    let bufferData = {
      source: flagState.otherStreamFlag,
      video: toBase64(),
      audio: new Float32Array(bufferSize),
      bufferSize: bufferSize,
      duration: e.inputBuffer.duration,
    };
    e.inputBuffer.copyFromChannel(bufferData.audio, 0);
    console.log(bufferData);
    socketState.socket.emit("chatFromClient", bufferData);
  }
  if (timelapseState.flag && timelapseState.trriger) {
    // console.log("timelapse emit");
    let bufferData = {
      source: "TIMELAPSE",
      video: toBase64(),
      audio: new Float32Array(bufferSize),
      bufferSize: bufferSize,
      duration: e.inputBuffer.duration,
    };
    e.inputBuffer.copyFromChannel(bufferData.audio, 0);
    // console.log(bufferData.audio)
    // console.log("socket.id(chatFromClient)", socket.id);
    socketState.socket.emit("chatFromClient", bufferData);
    // flagState.timelapseFlag = false;
    timelapseState.trriger = false;
  }
  if (flagState.simulate) {
    let freqData = new Uint8Array(otherNodeState.analyser.frequencyBinCount);
    otherNodeState.analyser.getByteFrequencyData(freqData);
    // console.log(freqData.length);
    let freq = { freq: 0, val: 0 };
    for (let i = 0, len = freqData.length; i < len; i++) {
      //if(freq.val < freqData[i]) freq = {freq:(i*20000/2048), val:freqData[i]/256}
      if (freq.val < freqData[i])
        freq = {
          freq: (i * 22050) / otherNodeState.analyser.fftSize,
          val: freqData[i] / 256,
        };
    }
    //let currentTime = contextState.audioContext.currentTime
    if (freq.val > gainState.simulateBassGain)
      freq.val = gainState.simulateBassGain;
    let currentTime = contextState.audioContext.currentTime;
    gainState.simulateGain.gain.setTargetAtTime(freq.val, currentTime, 0.1);
    oscState.simulateOsc.frequency.setTargetAtTime(freq.freq, currentTime, 0.1);
    erasePrint();
    textPrint(String(freq.freq) + "Hz");
  }
};
