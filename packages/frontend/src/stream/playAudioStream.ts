import { contextState, gainState, convolverState } from "../state";

export const playAudioStream = (
  bufferArray: Float32Array,
  sampleRate: number,
  glitch: boolean,
  bufferSize: number
) => {
  // console.log(sampleRate);
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
    audio_src.connect(gainState.chatGain);
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
  }
  audio_src.start(0);
};
