import { contextState, gainState } from "../../state";
import { setGainUI } from "../../ui/gainUI";

export const gainChange = (data) => {
  const currentTime = contextState.audioContext.currentTime;
  gainState.masterGain.gain.setTargetAtTime(data.MASTER, currentTime, 0);
  gainState.simulateMaxGain = data.SIMULATE;
  gainState.chatGain.gain.setTargetAtTime(data.CHAT, currentTime, 0);
  gainState.glitchGain.gain.setTargetAtTime(data.GLITCH, currentTime, 0);
  gainState.oscGain.gain.setTargetAtTime(data.SINEWAVE, currentTime, 0);
  gainState.feedbackGain.gain.setTargetAtTime(data.FEEDBACK, currentTime, 0);
  gainState.whitenoiseGain.gain.setTargetAtTime(data.WHITENOISE, currentTime, 0);
  gainState.clickGain.gain.setTargetAtTime(data.CLICK, currentTime, 0);
  gainState.bassGain.gain.setTargetAtTime(data.BASS, currentTime, 0);
  setGainUI(data);
};
