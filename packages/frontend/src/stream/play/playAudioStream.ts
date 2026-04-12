import {
  contextState,
  gainState,
  convolverState,
  filterState,
} from "../../state";
import { filterStateType } from "../../../../../types";

export const playAudioStream = (
  bufferArray: ArrayBuffer,
  sampleRate: number,
  glitch: boolean,
  bufferSize: number,
  filter?: filterStateType
) => {
  console.log("sampleRate:", sampleRate);
  // console.log(bufferSize);
  // console.log(bufferArray);

  let audio_src = contextState.audioContext.createBufferSource();
  const flo32arr = new Float32Array(bufferArray);
  let audioData = new Float32Array(bufferSize);
  for (let i = 0; i < bufferSize; i++) {
    if (flo32arr[i]) {
      audioData[i] = flo32arr[i];
      // audioData[i] = 1.0
    } else {
      audioData[i] = 0.0;
    }
  }
  // console.log(sampleRate);
  // console.log(bufferSize);
  // console.log(audioData)
  if (!glitch) {
    let audio_buf = contextState.audioContext.createBuffer(
      1,
      bufferSize,
      sampleRate
    );
    audio_buf.copyToChannel(audioData, 0);
    audio_src.buffer = audio_buf;
    if (filter === undefined || !filter.flag) {
      audio_src.connect(gainState.chatGain);
    } else {
      console.log("filter applied:", filter);
      filterState.chatFilter!.type = filter.type;
      filterState.chatFilter!.frequency.setValueAtTime(filter.frequency, 0);
      filterState.chatFilter!.Q.setValueAtTime(filter.Q, 0);
      filterState.chatFilter!.gain.setValueAtTime(filter.gain, 0);
      audio_src.connect(filterState.chatFilter!);
    }
  } else {
    // console.log("glitched");
    let audio_buf = contextState.audioContext.createBuffer(
      1,
      bufferSize,
      convolverState.convolver.context.sampleRate
    );
    audio_buf.copyToChannel(audioData, 0);

    audio_src.buffer = audio_buf;
    convolverState.convolver.buffer = audio_buf;
    audio_src.connect(convolverState.convolver);
    audio_src.playbackRate.value =
      sampleRate !== undefined && sampleRate !== null && sampleRate > 0
        ? sampleRate / 44100
        : 1.0;
  }
  audio_src.start(0);
};
