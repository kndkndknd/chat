export const webAudioState = {
  audioContext: null as AudioContext | null,
  osc: {
    osc: null as OscillatorNode | null,
    whitenoiseOsc: null as AudioBufferSourceNode | null,
    bassOsc: null as OscillatorNode | null,
    clickOsc: null as OscillatorNode | null,
    simlateOsc: null as OscillatorNode | null,
    threeOsc: null as OscillatorNode | null,
  },
  gain: {
    masterGain: null as GainNode | null,
    chatGain: null as GainNode | null,
    oscGain: null as GainNode | null,
    feedbackGain: null as GainNode | null,
    whitenoiseGain: null as GainNode | null,
    bassGain: null as GainNode | null,
    clickGain: null as GainNode | null,
    simlateGain: null as GainNode | null,
    glitchGain: null as GainNode | null,
    feedbackReverveGain: null as GainNode | null,
    threeGain: null as GainNode | null,
  },
  scriptPocessor: {
    whitenoiseNose: null as ScriptProcessorNode | null,
    javascriptnode: null as ScriptProcessorNode | null,
  },
  convolver: {
    convolver: null as ConvolverNode | null,
    feedbackReverve: null as ConvolverNode | null,
  },
};
