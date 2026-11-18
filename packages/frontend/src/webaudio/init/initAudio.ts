import {
  contextState,
  oscState,
  gainState,
  convolverState,
  filterState,
  otherNodeState,
  stereoPannerState,
  audioWorkletState,
  flagState,
} from "../../state";
import { initWhitenoiseWorklet } from "../../audioWorklet/whitenoiseWorklet";
import { GAIN_DEFAULTS } from "../params/applyGlobalGain";

// backend の cmdState.GAIN 既定値と一致させる。
// 実際の値は接続後に gainFromServer で上書きされる。

export const initAudio = async (
  initWhitenoise: () => Promise<void> = initWhitenoiseWorklet,
) => {

  if(window.location.pathname.includes("left")) {
    stereoPannerState.masterPannerParam = -1;
    console.log("left channel");
  } else if (window.location.pathname.includes("right")) {
    stereoPannerState.masterPannerParam = 1;
    console.log("right channel");
  }


  // console.log("debug1");
  contextState.audioContext = new AudioContext();
  gainState.masterGain = contextState.audioContext.createGain();
  gainState.masterGain.gain.setValueAtTime(1, 0);
  // グローバルミュート専用の GainNode。MASTER の音量設定を壊さずに
  // 最終出力だけを 0 にできるよう、masterPanner の後段に置く。
  gainState.muteGain = contextState.audioContext.createGain();
  gainState.muteGain.gain.setValueAtTime(flagState.mute ? 0 : 1, 0);
  stereoPannerState.masterPanner = contextState.audioContext.createStereoPanner();
  stereoPannerState.masterPanner.pan.setValueAtTime(
    stereoPannerState.masterPannerParam,
    0,
  );
  gainState.masterGain.connect(stereoPannerState.masterPanner);
  stereoPannerState.masterPanner.connect(gainState.muteGain);
  gainState.muteGain.connect(contextState.audioContext.destination);
  // console.log(gainState.masterGain.gain.maxValue);

  //record/play
  // javascriptnode = contextState.audioContext.createScriptProcessor(8192, 1, 1);
  // sinewave
  oscState.osc = contextState.audioContext.createOscillator();
  gainState.oscGain = contextState.audioContext.createGain();
  gainState.sinewaveMixGain = contextState.audioContext.createGain();
  oscState.osc.connect(gainState.oscGain);
  oscState.osc.frequency.setValueAtTime(440, 0);
  gainState.oscGain.gain.setValueAtTime(0, 0);
  gainState.sinewaveMixGain.gain.setValueAtTime(
    GAIN_DEFAULTS.SINEWAVE,
    0,
  );
  gainState.oscGain.connect(gainState.sinewaveMixGain);
  gainState.sinewaveMixGain.connect(gainState.masterGain);
  oscState.osc.start(0);

  // feedback
  gainState.feedbackGain = contextState.audioContext.createGain();
  gainState.feedbackGain.gain.setValueAtTime(0, 0);
  gainState.feedbackMixGain = contextState.audioContext.createGain();
  gainState.feedbackMixGain.gain.setValueAtTime(
    GAIN_DEFAULTS.FEEDBACK,
    0,
  );
  gainState.feedbackGain.connect(gainState.feedbackMixGain);
  gainState.feedbackMixGain.connect(gainState.masterGain);
  //whitenoise
  // oscState.whitenoiseOsc = contextState.audioContext.createOscillator();
  await initWhitenoise();
  gainState.whitenoiseGain = await contextState.audioContext.createGain();
  gainState.whitenoiseMixGain = contextState.audioContext.createGain();
  await gainState.whitenoiseGain.gain.setValueAtTime(0, 0);
  gainState.whitenoiseMixGain.gain.setValueAtTime(
    GAIN_DEFAULTS.WHITENOISE,
    0,
  );
  await audioWorkletState.whitenoise.audioWorklet.connect(
    gainState.whitenoiseGain,
  );
  // oscState.whitenoiseOsc.connect(scriptProcessorState.whitenoiseNode);
  // scriptProcessorState.whitenoiseNode.connect(gainState.whitenoiseGain);
  await gainState.whitenoiseGain.connect(gainState.whitenoiseMixGain);
  gainState.whitenoiseMixGain.connect(gainState.masterGain);
  // oscState.whitenoiseOsc.start(0);

  //bass
  oscState.bassOsc = contextState.audioContext.createOscillator();
  gainState.bassGain = contextState.audioContext.createGain();
  gainState.bassMixGain = contextState.audioContext.createGain();
  oscState.bassOsc.connect(gainState.bassGain);
  oscState.bassOsc.frequency.setValueAtTime(88, 0);
  gainState.bassGain.gain.setValueAtTime(0, 0);
  gainState.bassMixGain.gain.setValueAtTime(GAIN_DEFAULTS.BASS, 0);
  gainState.bassGain.connect(gainState.bassMixGain);
  gainState.bassMixGain.connect(gainState.masterGain);
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
  gainState.glitchGain.gain.setValueAtTime(GAIN_DEFAULTS.GLITCH, 0);
  convolverState.convolver.connect(gainState.glitchGain);
  // GLITCH も MASTER の配下に置く。
  gainState.glitchGain.connect(gainState.masterGain);

  gainState.feedbackReverveGain = contextState.audioContext.createGain();
  gainState.feedbackReverveGain.gain.setValueAtTime(0, 0);
  convolverState.feedbackReverve = contextState.audioContext.createConvolver();
  convolverState.feedbackReverve.connect(gainState.feedbackReverveGain);

  gainState.chatGain = contextState.audioContext.createGain();
  gainState.chatGain.gain.setValueAtTime(GAIN_DEFAULTS.CHAT, 0);
  gainState.chatGain.connect(gainState.masterGain);

  // chat filter
  filterState.chatFilter = contextState.audioContext.createBiquadFilter();
  filterState.chatFilter.type = "lowpass";
  filterState.chatFilter.frequency.setValueAtTime(1000, 0);
  filterState.chatFilter.Q.setValueAtTime(2.5, 0);
  filterState.chatFilter.gain.setValueAtTime(GAIN_DEFAULTS.CHAT, 0);
  // フィルタ付き CHAT も chatGain を経由させ、GAIN CHAT を全域に効かせる。
  filterState.chatFilter.connect(gainState.chatGain);

  // SIMULATE
  oscState.simulateOsc = contextState.audioContext.createOscillator();
  gainState.simulateGain = contextState.audioContext.createGain();
  gainState.simulateMixGain = contextState.audioContext.createGain();
  oscState.simulateOsc.connect(gainState.simulateGain);
  oscState.simulateOsc.frequency.setValueAtTime(440, 0);
  gainState.simulateGain.gain.setValueAtTime(0, 0);
  gainState.simulateMixGain.gain.setValueAtTime(
    GAIN_DEFAULTS.SIMULATE,
    0,
  );
  gainState.simulateGain.connect(gainState.simulateMixGain);
  gainState.simulateMixGain.connect(gainState.masterGain);
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
