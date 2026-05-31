import { contextState, audioWorkletState } from "../state";

export const initWhitenoiseWorklet = async () => {
  if (!contextState.audioContext) {
    throw new Error("AudioContext is not initialized.");
  }
  await contextState.audioContext.audioWorklet.addModule(
    "./whitenoise-processor.js",
  );
  audioWorkletState.whitenoise.audioWorklet = new AudioWorkletNode(
    contextState.audioContext,
    "white-noise-processor",
    {
      outputChannelCount: [2],
    },
  );
};
