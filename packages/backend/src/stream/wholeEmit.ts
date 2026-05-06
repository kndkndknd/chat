import SocketIO from "socket.io";
import { wholeParams } from "../data/list/wholeParams";
import { streamList, streamsRedis, chatsRedis } from "../data";
import { wholeCmdOption } from "../../../../types";
import { genEmptyBuff } from "./genEmptyBuff";
import { clientState, cmdState, sampleRateState, glitchState, currentState } from "../state";
import { ioState } from "../state/states/ioState";

export const wholeEmit = async () => {
  if (!currentState.WHOLE) {
    console.log("wholeEmit: currentState.WHOLE is false, skipping emit");
    return;
  }
  console.log("wholeEmit");

  const durationArr = [8192 / 176400, 8192 / 132300 * 1000, 8192 / 88200 * 1000, 8192 / 44100 * 1000, 8192 / 22050 * 1000, 8192 / 11025 * 1000, 8192 / 5512 * 1000, 8192 / 2756 * 1000];

  if (wholeParams.targetArr.length === 0) {
    wholeParams.targetArr = ["FEEDBACK", "WHITENOISE", "CLICK", "BASS", ...streamList];
  }
  const chatsLen = await chatsRedis.length();
  if (!wholeParams.targetArr.includes("CHAT") && chatsLen > 0) {
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
    };
  } else if (targetCmd === "FEEDBACK" || targetCmd === "WHITENOISE" || targetCmd === "CLICK" || targetCmd === "BASS") {
    option = {
      type: "other",
      cmd: targetCmd,
      duration: durationArr[Math.floor(Math.random() * durationArr.length)],
      gain: cmdState.GAIN[targetCmd] !== undefined ? <number>cmdState.GAIN[targetCmd] : 1,
    };
  } else if (streamList.includes(targetCmd)) {
    const buffLen = await streamsRedis.getLength(targetCmd);
    const entry = (targetCmd !== "EMPTY" && buffLen > 0)
      ? await streamsRedis.getRandom(targetCmd)
      : null;
    const audio = entry?.audio ?? genEmptyBuff();
    const video = entry?.video;
    const bufferSize = entry?.bufferSize ?? 8192;
    option = {
      type: "stream",
      source: targetCmd,
      audio,
      video,
      bufferSize,
      sampleRate: sampleRateState.randomraterange[targetCmd].min + Math.random() * (sampleRateState.randomraterange[targetCmd].max - sampleRateState.randomraterange[targetCmd].min),
      glitch: Math.random() < 0.5 ? true : false,
      duration: bufferSize / sampleRateState.sampleRate[targetCmd] * 1000,
    };
    if (option.glitch) {
      option.sampleRate = glitchState.glitchSampleRate;
      option.duration = bufferSize / option.sampleRate * 1000;
    }
  } else if (targetCmd === "CHAT" && chatsLen > 0) {
    const index = Math.floor(Math.random() * chatsLen);
    const chat = await chatsRedis.get(index);
    if (chat) {
      option = {
        type: "stream",
        source: "CHAT",
        audio: chat.audio,
        video: chat.video,
        bufferSize: chat.bufferSize,
        sampleRate: sampleRateState.sampleRate["CHAT"],
        glitch: glitchState.glitch["CHAT"],
        duration: chat.bufferSize / sampleRateState.sampleRate["CHAT"] * 1000,
      };
    }
  }

  if (!option) {
    option = {
      type: "sinewave",
      cmd: "SINEWAVE",
      frequency: wholeParams.frequency.min + Math.random() * (wholeParams.frequency.max - wholeParams.frequency.min),
      duration: wholeParams.length.min + Math.random() * (wholeParams.length.max - wholeParams.length.min),
      gain: cmdState.GAIN.SINEWAVE,
    };
  }

  const targetClientArr = Object.keys(clientState.client);
  ioState.io?.to(targetClientArr[Math.floor(Math.random() * targetClientArr.length)]).emit("wholeCmdFromServer", option);
};
