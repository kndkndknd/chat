import { contextState } from "../../state";
import {
  SYNTH_BUS_GAIN,
  SYNTH_WET_GAIN,
  SynthVoice,
  synthState,
} from "../../state/webAudio/synthState";

// A マイナーペンタトニック。毎回この中から 1 音を選ぶ。
export const SYNTH_NOTES = [
  110.0, 130.81, 146.83, 164.81, 196.0, 220.0, 261.63, 293.66, 329.63, 392.0,
];

const DURATION = 2.8;

export const pickSynthFrequency = (): number =>
  SYNTH_NOTES[Math.floor(Math.random() * SYNTH_NOTES.length)];

// SYNTH <Hz> の指定値を検証する。範囲外や非数はランダム音にフォールバックする。
export const resolveSynthFrequency = (
  frequency?: number,
): number | undefined =>
  frequency !== undefined &&
  Number.isFinite(frequency) &&
  frequency >= 20 &&
  frequency <= 20000
    ? frequency
    : undefined;

const createSoftClipCurve = (): Float32Array => {
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * 2.5);
  }
  return curve;
};

const createNoiseBuffer = (
  ctx: AudioContext,
  duration: number,
): AudioBuffer => {
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
};

// モジュラーシンセ風のワンショット。
// デチューンした 2 本のノコギリ波 + サブ矩形波を、レゾナンスの強い
// ローパスに通し、フィルターエンベロープと LFO で動かす。
// さらに短いノイズのアタック、ソフトクリップ、ステレオパン、ディレイを加える。
export const synth = (frequency?: number, gain?: number): void => {
  const ctx = contextState.audioContext;
  const bus = synthState.input;
  if (!ctx || !bus) {
    return;
  }

  const now = ctx.currentTime;
  const start = now + 0.01;
  const end = start + DURATION;
  const level = Math.max(0.0001, gain ?? 0.55);
  const requestedFrequency = resolveSynthFrequency(frequency);

  // STOP で 0 にしたバスを復帰させる。
  bus.gain.cancelScheduledValues(now);
  bus.gain.setTargetAtTime(SYNTH_BUS_GAIN, now, 0.01);
  if (synthState.wet) {
    synthState.wet.gain.cancelScheduledValues(now);
    synthState.wet.gain.setTargetAtTime(SYNTH_WET_GAIN, now, 0.01);
  }

  const voiceGain = ctx.createGain();
  voiceGain.gain.setValueAtTime(0, start);
  voiceGain.gain.linearRampToValueAtTime(level, start + 0.01);
  voiceGain.gain.exponentialRampToValueAtTime(level * 0.55, start + 0.18);
  voiceGain.gain.exponentialRampToValueAtTime(0.0001, end);

  const note = requestedFrequency ?? pickSynthFrequency();

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.setValueAtTime(9 + Math.random() * 9, start);
  // 指定周波数が高いほどフィルターも開き、低い音では暗めにする。
  const startCutoff = Math.min(
    12000,
    Math.max(1200, note * 8 + Math.random() * 1800),
  );
  const endCutoff = Math.min(
    2400,
    Math.max(160, note * 1.2 + Math.random() * 200),
  );
  filter.frequency.setValueAtTime(
    Math.max(180, Math.min(1200, note * 2)),
    start,
  );
  filter.frequency.exponentialRampToValueAtTime(startCutoff, start + 0.04);
  filter.frequency.exponentialRampToValueAtTime(endCutoff, start + 1.6);

  const shaper = ctx.createWaveShaper();
  shaper.curve = createSoftClipCurve();
  shaper.oversample = "2x";

  const mix = ctx.createGain();
  mix.gain.setValueAtTime(0.5, start);

  const oscA = ctx.createOscillator();
  oscA.type = "sawtooth";
  oscA.frequency.setValueAtTime(note * 0.97, start);
  oscA.frequency.exponentialRampToValueAtTime(note, start + 0.05);
  oscA.detune.setValueAtTime(-9 + Math.random() * 4, start);

  const oscB = ctx.createOscillator();
  oscB.type = "sawtooth";
  oscB.frequency.setValueAtTime(note, start);
  oscB.detune.setValueAtTime(9 + Math.random() * 4, start);

  const sub = ctx.createOscillator();
  sub.type = "square";
  sub.frequency.setValueAtTime(note / 2, start);
  const subGain = ctx.createGain();
  subGain.gain.setValueAtTime(0.3, start);

  oscA.connect(mix);
  oscB.connect(mix);
  sub.connect(subGain);
  subGain.connect(mix);
  mix.connect(filter);
  filter.connect(shaper);
  shaper.connect(voiceGain);

  // フィルターをゆっくり動かす LFO。
  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.setValueAtTime(0.07 + Math.random() * 0.28, start);
  const lfoGain = ctx.createGain();
  lfoGain.gain.setValueAtTime(100 + Math.random() * 260, start);
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);

  // アタック用の短いノイズ。フィルターのレゾナンスを叩く。
  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, 0.3);
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.setValueAtTime(1200 + Math.random() * 4200, start);
  noiseFilter.Q.setValueAtTime(10 + Math.random() * 10, start);
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.16, start);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(voiceGain);

  const panner = ctx.createStereoPanner();
  panner.pan.setValueAtTime(Math.random() - 0.5, start);
  voiceGain.connect(panner);
  panner.connect(bus);

  oscA.start(start);
  oscB.start(start);
  sub.start(start);
  lfo.start(start);
  noise.start(start);
  oscA.stop(end + 0.05);
  oscB.stop(end + 0.05);
  sub.stop(end + 0.05);
  lfo.stop(end + 0.05);
  noise.stop(start + 0.3);

  const voice: SynthVoice = {
    gain: voiceGain,
    sources: [oscA, oscB, sub, lfo, noise],
    stopped: false,
  };
  synthState.activeVoices.add(voice);

  window.setTimeout(() => {
    synthState.activeVoices.delete(voice);
  }, (DURATION + 0.5) * 1000);
};

// STOP 時に鳴っている SYNTH を止める。
export const stopSynth = (fade = 0.05): void => {
  const ctx = contextState.audioContext;
  if (!ctx) {
    return;
  }

  const now = ctx.currentTime;
  const fadeTime = Math.max(0.005, fade);

  synthState.activeVoices.forEach((voice) => {
    if (voice.stopped) {
      return;
    }
    voice.stopped = true;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setTargetAtTime(0, now, fadeTime);
    voice.sources.forEach((source) => {
      try {
        source.stop(now + fadeTime * 4 + 0.02);
      } catch {
        // すでに停止済みの source は無視する。
      }
    });
  });
  synthState.activeVoices.clear();

  if (synthState.input) {
    synthState.input.gain.cancelScheduledValues(now);
    synthState.input.gain.setTargetAtTime(0, now, fadeTime);
  }
  if (synthState.wet) {
    synthState.wet.gain.cancelScheduledValues(now);
    synthState.wet.gain.setTargetAtTime(0, now, fadeTime);
  }
};
