import { contextState, gainState } from "../../state";

export const whitenoise = (flag: boolean, fade: number, gain: number) => {
  const currentTime = contextState.audioContext.currentTime;

  console.log("currentTime", currentTime);
  console.log("fade", fade);
  console.log("gain", gain);
  if (flag) {
    // 音量は whitenoiseMixGain が担当する。
    gainState.whitenoiseGain.gain.setTargetAtTime(1, currentTime, fade);
  } else {
    gainState.whitenoiseGain.gain.setTargetAtTime(0, currentTime, fade);
  }
};
