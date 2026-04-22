import SocketIO from "socket.io";
import { wholeParams } from "../data/list/wholeParams";
import { streamList, cmdList, streams, chats } from "../data";
import { wholeCmdOption } from "../../../../types";
import { genEmptyBuff } from "./genEmptyBuff";
import { clientState, cmdState, sampleRateState, glitchState, currentState } from "../state";

export const wholeEmit = (io: SocketIO.Server) => {
  if(!currentState.WHOLE) {
    console.log("wholeEmit: currentState.WHOLE is false, skipping emit");
    return;
  }
  console.log("wholeEmit");

  const durationArr = [8192 / 176400, 8192 / 132300 * 1000, 8192 / 88200 * 1000, 8192 / 44100 * 1000, 8192 / 22050 * 1000, 8192 / 11025 * 1000, 8192 / 5512 * 1000, 8192 / 2756 * 1000];

  if( wholeParams.targetArr.length === 0 ) {
    wholeParams.targetArr = ["FEEDBACK", "WHITENOISE", "CLICK", "BASS", ...streamList];
  }
  if (!wholeParams.targetArr.includes("CHAT") && chats.length > 0) {
    wholeParams.targetArr.push("CHAT");
  }

  const targetCmd = wholeParams.targetArr[Math.floor(Math.random() * wholeParams.targetArr.length)];
  let option: wholeCmdOption;
  if (targetCmd === "SINEWAVE") {
    option = {
      type: "sinewave",
      cmd: "SINEWAVE",
      frequency: wholeParams.frequency.min + Math.random() * (wholeParams.frequency.max - wholeParams.frequency.min),
      duration: durationArr[Math.floor(Math.random() * durationArr.length)],
      gain: cmdState.GAIN.SINEWAVE,
    }
  } else if (targetCmd === "FEEDBACK" || targetCmd === "WHITENOISE" || targetCmd === "CLICK" || targetCmd === "BASS") {
    option = {
      type: "other",
      cmd: targetCmd,
      duration: durationArr[Math.floor(Math.random() * durationArr.length)],
      gain: cmdState.GAIN[targetCmd] !== undefined ? <number>cmdState.GAIN[targetCmd] : 1
    }
  } else if (streamList.includes(targetCmd)) {
    option = {
      type: "stream",
      source: targetCmd,
      audio: targetCmd !== "EMPTY" && streams[targetCmd].audio.length > 0 ? streams[targetCmd].audio[Math.floor(Math.random() * streams[targetCmd].audio.length)] : genEmptyBuff(),
      video: (streams[targetCmd].video !== undefined &&streams[targetCmd].video.length > 0) ? streams[targetCmd].video[Math.floor(Math.random() * streams[targetCmd].video.length)] : undefined,
      bufferSize: streams[targetCmd].bufferSize,
      // sampleRate: sampleRateState.sampleRate[targetCmd],
      sampleRate: sampleRateState.randomraterange[targetCmd].min + Math.random() * (sampleRateState.randomraterange[targetCmd].max - sampleRateState.randomraterange[targetCmd].min),
      glitch: Math.random() < 0.5 ? true : false,
      duration: streams[targetCmd].bufferSize / sampleRateState.sampleRate[targetCmd] * 1000
    }
    if(option.glitch) {
      option.sampleRate = glitchState.glitchSampleRate;
      option.duration = streams[targetCmd].bufferSize / option.sampleRate * 1000;
    }
    // if (sampleRateState.randomrate[targetCmd]) {
    //   option.sampleRate = sampleRateState.randomraterange[targetCmd].min + Math.random() * (sampleRateState.randomraterange[targetCmd].max - sampleRateState.randomraterange[targetCmd].min);
    //   option.duration = streams[targetCmd].bufferSize / option.sampleRate * 1000;
    // }
    // if (glitchState.glitch[targetCmd]) {
    //   option.sampleRate = glitchState.glitchSampleRate;
    //   option.duration = streams[targetCmd].bufferSize / option.sampleRate * 1000;
    // }
  } else if (targetCmd === "CHAT" && chats.length > 0) {
    const index = Math.floor(Math.random() * chats.length);
    option = {
      type: "stream",
      source: "CHAT",
      audio: chats[index].audio,
      video: chats[index].video,
      bufferSize: chats[index].bufferSize,
      sampleRate: sampleRateState.sampleRate["CHAT"],
      glitch: glitchState.glitch["CHAT"],
      duration: chats[index].bufferSize / sampleRateState.sampleRate["CHAT"] * 1000,
    }
  } else {
    // どれも選ばれなかった場合は、SINEWAVEをデフォルトで返する
    option = {
      type: "sinewave",
      cmd: "SINEWAVE",
      frequency: wholeParams.frequency.min + Math.random() * (wholeParams.frequency.max - wholeParams.frequency.min),
      duration: wholeParams.length.min + Math.random() * (wholeParams.length.max - wholeParams.length.min),
      gain: cmdState.GAIN.SINEWAVE,
    }
  }
  const targetClientArr = Object.keys(clientState.client);
  io.to(targetClientArr[Math.floor(Math.random() * targetClientArr.length)]).emit("wholeCmdFromServer", option);
};
