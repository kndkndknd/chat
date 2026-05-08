import { contextState, audioWorkletState } from "../state";

const WHITENOISE_BUFFER_SIZE = 4096;
const WHITENOISE_GAIN = 0.5;

export const initWhitenoiseScriptProcessor = async () => {
  if (!contextState.audioContext) {
    throw new Error("AudioContext is not initialized.");
  }
  const ctx = contextState.audioContext;
  const node = ctx.createScriptProcessor(WHITENOISE_BUFFER_SIZE, 0, 2);

  node.onaudioprocess = (event: AudioProcessingEvent) => {
    const output = event.outputBuffer;
    for (let ch = 0; ch < output.numberOfChannels; ch++) {
      const data = output.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * WHITENOISE_GAIN;
      }
    }
  };

  audioWorkletState.whitenoise.audioWorklet = node;
};
