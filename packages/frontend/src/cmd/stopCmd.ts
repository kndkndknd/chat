import {
  contextState,
  gainState,
  metronomeState,
  flagState,
  streamFlagState,
  audioWorkletState,
} from "../state";

export const stopCmd = (fade: number, except?: string) => {
  const currentTime = contextState.audioContext.currentTime;
  if (except !== "BASS") {
    gainState.bassGain.gain.setValueAtTime(0, 0);
  }
  if (except !== "FEEDBACK") {
    gainState.feedbackGain.gain.setTargetAtTime(0, currentTime, fade);
  }
  if (except !== "WHITENOISE") {
    gainState.whitenoiseGain.gain.setTargetAtTime(0, currentTime, fade);
  }
  if (except !== "SINEWAVE") {
    gainState.oscGain.gain.setTargetAtTime(0, currentTime, fade);
  }
  if (except !== "SIMULATE") {
    gainState.simulateGain.gain.setTargetAtTime(0, currentTime, fade);
  }
  if (metronomeState.intervalId && except !== "METRONOME") {
    clearInterval(metronomeState.intervalId);
  }
  // if (except !== "HLS") {
  //   hlsVideoStop();
  // }
  flagState.simulate = false;
  for (let key in streamFlagState) {
    streamFlagState[key] = false;
  }

  for (const key in audioWorkletState.flag) {
    audioWorkletState.flag[key] = false;
  }

  console.log("stopCmd", streamFlagState);
  // const hlsVideo = document.getElementById("hls") as HTMLVideoElement;
};
