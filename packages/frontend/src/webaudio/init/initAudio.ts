import {
  contextState,
  oscState,
  gainState,
  convolverState,
  filterState,
  otherNodeState,
  audioWorkletState,
} from "../../state";
import { initWhitenoiseWorklet } from "../../audioWorklet/whitenoiseWorklet";

const chatGainVal = 1.5;
const glitchGainVal = 1.5;

export const initAudio = async () => {
  // console.log("debug1");
  contextState.audioContext = new AudioContext();
  gainState.masterGain = contextState.audioContext.createGain();
  gainState.masterGain.gain.setValueAtTime(1, 0);
  gainState.masterGain.connect(contextState.audioContext.destination);
  // console.log(gainState.masterGain.gain.maxValue);

  //record/play
  // javascriptnode = contextState.audioContext.createScriptProcessor(8192, 1, 1);
  // sinewave
  oscState.osc = contextState.audioContext.createOscillator();
  gainState.oscGain = contextState.audioContext.createGain();
  oscState.osc.connect(gainState.oscGain);
  oscState.osc.frequency.setValueAtTime(440, 0);
  gainState.oscGain.gain.setValueAtTime(0, 0);
  gainState.oscGain.connect(gainState.masterGain);
  oscState.osc.start(0);

  // feedback
  gainState.feedbackGain = contextState.audioContext.createGain();
  gainState.feedbackGain.gain.setValueAtTime(0, 0);

  //whitenoise
  // oscState.whitenoiseOsc = contextState.audioContext.createOscillator();
  await initWhitenoiseWorklet();
  gainState.whitenoiseGain = await contextState.audioContext.createGain();
  await gainState.whitenoiseGain.gain.setValueAtTime(0, 0);
  await audioWorkletState.whitenoise.audioWorklet.connect(
    gainState.whitenoiseGain,
  );
  // oscState.whitenoiseOsc.connect(scriptProcessorState.whitenoiseNode);
  // scriptProcessorState.whitenoiseNode.connect(gainState.whitenoiseGain);
  await gainState.whitenoiseGain.connect(gainState.masterGain);
  // oscState.whitenoiseOsc.start(0);

  //bass
  oscState.bassOsc = contextState.audioContext.createOscillator();
  gainState.bassGain = contextState.audioContext.createGain();
  oscState.bassOsc.connect(gainState.bassGain);
  oscState.bassOsc.frequency.setValueAtTime(88, 0);
  gainState.bassGain.gain.setValueAtTime(0, 0);
  gainState.bassGain.connect(gainState.masterGain);
  oscState.bassOsc.start(0);

  //click
  oscState.clickOsc = contextState.audioContext.createOscillator();
  gainState.clickGain = contextState.audioContext.createGain();
  oscState.clickOsc.connect(gainState.clickGain);
  oscState.clickOsc.frequency.setValueAtTime(440, 0);
  gainState.clickGain.gain.setValueAtTime(0, 0);
  gainState.clickGain.connect(gainState.masterGain);
  oscState.clickOsc.start(0);

  // chat / feedback
  // scriptProcessorState.javascriptnode =
  //   contextState.audioContext.createScriptProcessor(8192, 1, 1);
  convolverState.convolver = contextState.audioContext.createConvolver();
  gainState.glitchGain = contextState.audioContext.createGain();
  gainState.glitchGain.gain.setValueAtTime(glitchGainVal, 0);
  convolverState.convolver.connect(gainState.glitchGain);
  gainState.glitchGain.connect(contextState.audioContext.destination);

  gainState.feedbackGain = contextState.audioContext.createGain();
  gainState.feedbackGain.gain.setValueAtTime(0, 0);
  gainState.feedbackReverveGain = contextState.audioContext.createGain();
  gainState.feedbackReverveGain.gain.setValueAtTime(0, 0);
  convolverState.feedbackReverve = contextState.audioContext.createConvolver();
  convolverState.feedbackReverve.connect(gainState.feedbackReverveGain);

  gainState.chatGain = contextState.audioContext.createGain();
  gainState.chatGain.gain.setValueAtTime(chatGainVal, 0);
  gainState.chatGain.connect(gainState.masterGain);

  // chat filter
  filterState.chatFilter = contextState.audioContext.createBiquadFilter();
  filterState.chatFilter.type = "lowpass";
  filterState.chatFilter.frequency.setValueAtTime(1000, 0);
  filterState.chatFilter.Q.setValueAtTime(2.5, 0);
  filterState.chatFilter.gain.setValueAtTime(chatGainVal, 0);
  filterState.chatFilter.connect(gainState.masterGain);
  // gainState.chatGain.disconnect();
  // gainState.chatGain.connect(filterState.chatFilter);
  // filterNodeState.chatFilter.connect(gainState.masterGain);

  // SIMULATE
  oscState.simulateOsc = contextState.audioContext.createOscillator();
  gainState.simulateGain = contextState.audioContext.createGain();
  oscState.simulateOsc.connect(gainState.simulateGain);
  oscState.simulateOsc.frequency.setValueAtTime(440, 0);
  gainState.simulateGain.gain.setValueAtTime(0, 0);
  gainState.simulateGain.connect(gainState.masterGain);
  oscState.simulateOsc.start(0);
  otherNodeState.simFilter = contextState.audioContext.createBiquadFilter();
  otherNodeState.simFilter.type = "lowpass";
  otherNodeState.simFilter.frequency.setValueAtTime(1000, 0);

  // THREE
  oscState.threeOsc = contextState.audioContext.createOscillator();
  oscState.threeOsc.type = "square";
  gainState.threeGain = contextState.audioContext.createGain();
  oscState.threeOsc.connect(gainState.threeGain);
  oscState.threeOsc.frequency.setValueAtTime(0, 0);
  gainState.threeGain.gain.setValueAtTime(1, 0);
  gainState.threeGain.connect(gainState.masterGain);
  oscState.threeOsc.start(0);

  // GPS & ACCELARATE
  oscState.gpsOsc = contextState.audioContext.createOscillator();
  gainState.gpsOscGain = contextState.audioContext.createGain();
  gainState.gpsOscGain.gain.setValueAtTime(0, 0);
  oscState.gpsOsc.connect(gainState.gpsOscGain);
  oscState.gpsOsc.frequency.setValueAtTime(440, 0);
  oscState.gpsOsc.start(0);
  oscState.accelarateOsc = contextState.audioContext.createOscillator();
  gainState.accelarateOscGain = contextState.audioContext.createGain();
  gainState.accelarateOscGain.gain.setValueAtTime(0, 0);
  oscState.accelarateOsc.connect(gainState.accelarateOscGain);
  oscState.accelarateOsc.frequency.setValueAtTime(440, 0);
  oscState.accelarateOsc.start(0);
};
