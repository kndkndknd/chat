// SYNTH コマンド用のワンショット音源バス。
// 複数のボイスを重ねられるよう、入力バスからコンプレッサー + ディレイへ送る。
export const SYNTH_BUS_GAIN = 0.7;
export const SYNTH_WET_GAIN = 0.25;

export type SynthVoice = {
  gain: GainNode;
  sources: AudioScheduledSourceNode[];
  stopped: boolean;
};

export const synthState = {
  input: null as GainNode | null,
  compressor: null as DynamicsCompressorNode | null,
  delay: null as DelayNode | null,
  delayFilter: null as BiquadFilterNode | null,
  feedback: null as GainNode | null,
  wet: null as GainNode | null,
  activeVoices: new Set<SynthVoice>(),
};
