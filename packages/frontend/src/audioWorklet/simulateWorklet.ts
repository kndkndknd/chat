import { contextState, flagState, oscState } from "../state";

const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

export function freqToNote(
  freq: number,
): { name: string; octave: number; cents: number } {
  const semitones = 12 * Math.log2(freq / 440);
  const rounded = Math.round(semitones);
  const cents = Math.round((semitones - rounded) * 100);
  const noteIndex = ((rounded + 69) % 12 + 12) % 12;
  const octave = Math.floor((rounded + 69) / 12);
  return { name: NOTE_NAMES[noteIndex], octave, cents };
}

export async function simulateWorklet(stream: MediaStream): Promise<void> {
  try {
    const wasmModule = await import("../wasm/simulate.js");
    await wasmModule.default();
    const { find_dominant_frequency } = wasmModule;

    // const ctx = new AudioContext();
    // const sampleRate = ctx.sampleRate;

    const ctx = contextState.audioContext;
    const sampleRate = ctx.sampleRate;
    const currentTime = ctx.currentTime;

    await ctx.audioWorklet.addModule("/simulate-worklet.js");
    const simulateWorkletNode = new AudioWorkletNode(
      ctx,
      "simulate-processor",
    );

    const simulateSource = ctx.createMediaStreamSource(stream);
    simulateSource.connect(simulateWorkletNode);
    simulateWorkletNode.connect(ctx.destination);


    simulateWorkletNode.port.onmessage = (e: MessageEvent<Float32Array>) => {
      if(!flagState.simulate) return;
      const samples: Float32Array = e.data;
      const freq = find_dominant_frequency(samples, sampleRate);

      if (freq >= 1) {
        console.log(`[Simulate] Frequency: ${freq.toFixed(1)} Hz`);
        oscState.simulateOsc.frequency.setTargetAtTime(freq, currentTime, 0.1);
        // const { name, octave, cents } = freqToNote(freq);
        // console.log(`[Simulate] Note: ${name}${octave}, Cents: ${cents}`);
      }
    };

    console.log("[Simulate] WASM FFT and AudioWorklet initialized successfully");
  } catch (err) {
    console.error("[Simulate] Error initializing simulate:", (err as Error).message);
  }
}
