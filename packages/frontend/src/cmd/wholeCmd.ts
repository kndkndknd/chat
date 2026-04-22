import { buffStateType, wholeCmdOption, wholeSinewaveOption, wholeCmdExceptSinewaveOption, wholeStreamOption } from "../../../../types"
import { bufferSizeState, socketState, wholeState } from "../state"
import { sinewave } from "../webaudio"
import { cmdFromServer } from "./cmdFromServer"
import { streamPlay } from "../stream"

export const wholeCmd = (option: wholeCmdOption) => {
  wholeState.flag = true;
  if(option.type === "sinewave") {
    sinewave(true, option.frequency, 0, 0, option.gain);
    setTimeout(() => {
      sinewave(false, option.frequency, 0.1, 0, option.gain);
      emitWholeReq();
    }, option.duration);
  } else if (option.type === "stream" && option.source !== "CHAT") {
    streamPlay("STREAM", socketState.socket, {
      audio: new Float32Array(option.audio),
      sampleRate: option.sampleRate,
      glitch: option.glitch !== undefined ? option.glitch : false,
      bufferSize: option.bufferSize,
      duration: option.duration,
      video: option.video,
      source: option.source
    }, true);
    setTimeout(() => {
      emitWholeReq();
    }, option.duration);
  } else if (option.type === "stream" && option.source === "CHAT") {
    streamPlay("CHAT", socketState.socket, {
      audio: new Float32Array(option.audio),
      sampleRate: option.sampleRate,
      glitch: option.glitch !== undefined ? option.glitch : false,
      bufferSize: option.bufferSize,
      duration: option.duration,
      video: option.video,
      source: option.source
    }, true);
    setTimeout(() => {
      emitWholeReq();
    }, option.duration);
  } else if (option.type === "other") {
    cmdFromServer({cmd: option.cmd, gain: option.gain, property: '', value: 0, flag: true, fade: 0});
    setTimeout(() => {
      cmdFromServer({cmd: option.cmd, gain: option.gain, property: '', value: 0, flag: false, fade: 0});
      emitWholeReq();
    }, option.duration);
  }
}

const emitWholeReq = () => {
  wholeState.flag = false;
  if(wholeState.audio !== null && wholeState.video !== null) {
    socketState.socket.emit("wholeReqFromClient", {
      audio: wholeState.audio,
      video: wholeState.video,
      source: "CHAT",
      bufferSize: bufferSizeState.bufferSize,
    })
    wholeState.audio = null;
    wholeState.video = null;
  } else {
    socketState.socket.emit("wholeReqFromClient");
  };
}
