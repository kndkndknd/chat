import { contextState, flagState, oscState } from "../state";
import { textPrint } from "../canvasEvent";

const SIMULATE_BUFFER_SIZE = 4096;
const SIMULATE_FFT_SIZE = 8192;

export async function simulateScriptProcessor(stream: MediaStream): Promise<void> {
  try {
    const wasmModule = await import("../wasm/simulate.js");
    await wasmModule.default();
    const { find_dominant_frequency } = wasmModule;

    if (!contextState.audioContext) {
      throw new Error("AudioContext is not initialized.");
    }
    const ctx = contextState.audioContext;
    const sampleRate = ctx.sampleRate;

    const node = ctx.createScriptProcessor(SIMULATE_BUFFER_SIZE, 1, 1);
    const source = ctx.createMediaStreamSource(stream);

    const fftBuffer = new Float32Array(SIMULATE_FFT_SIZE);
    let writeIndex = 0;

    node.onaudioprocess = (event: AudioProcessingEvent) => {
      const outputBuffer = event.outputBuffer;
      for (let ch = 0; ch < outputBuffer.numberOfChannels; ch++) {
        outputBuffer.getChannelData(ch).fill(0);
      }

      if (!flagState.simulate) return;

      const channel = event.inputBuffer.getChannelData(0);
      for (let i = 0; i < channel.length; i++) {
        fftBuffer[writeIndex++] = channel[i];
        if (writeIndex >= fftBuffer.length) {
          const samples = fftBuffer.slice(0);
          writeIndex = 0;
          const freq = find_dominant_frequency(samples, sampleRate);
          if (freq >= 20 && freq <= 20000) {
            console.log(`[Simulate] Frequency: ${freq.toFixed(1)} Hz`);
            textPrint(`${freq.toFixed(1)} Hz`);
            oscState.simulateOsc.frequency.setTargetAtTime(freq, ctx.currentTime, 0.1);
          }
        }
      }
    };

    source.connect(node);
    node.connect(ctx.destination);

    console.log("[Simulate] WASM FFT and ScriptProcessor initialized successfully");
  } catch (err) {
    console.error("[Simulate] Error initializing simulate:", (err as Error).message);
  }
}
