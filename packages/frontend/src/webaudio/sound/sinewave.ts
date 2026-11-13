import { contextState, oscState, gainState } from "../../state";

export const sinewave = (
  flag: boolean,
  frequency: number,
  fade: number,
  portament: number,
  gain: number
) => {
  const currentTime = contextState.audioContext.currentTime;
  console.log("debug");
  oscState.osc.frequency.setTargetAtTime(frequency, currentTime, portament);
  if (flag) {
    // 音量は sinewaveMixGain が担当する。ここは発音中/停止だけを切り替える。
    gainState.oscGain.gain.setTargetAtTime(1, currentTime, fade);
  } else {
    gainState.oscGain.gain.setTargetAtTime(0, currentTime, fade);
  }
};
