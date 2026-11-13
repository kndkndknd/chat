import { contextState, gainState } from "../../state";
import { GAIN_DEFAULTS } from "../params/applyGlobalGain";

export const feedback = (
  flag: boolean,
  fade: number,
  gain: number,
  type?: "normal" | "reverve"
) => {
  const currentTime = contextState.audioContext.currentTime;
  // if (type === undefined || type === "normal") {
  if (flag) {
    // 音量は feedbackMixGain が担当する。ここは発音中/停止だけを切り替える。
    gainState.feedbackGain.gain.setTargetAtTime(1, currentTime, fade);
  } else {
    gainState.feedbackGain.gain.setTargetAtTime(0, currentTime, fade);
  }
  // } else if (type === "reverve") {
  // if (flag) {
  //   gainState.feedbackReverveGain.gain.setTargetAtTime(gain, currentTime, fade);
  // } else {
  //   gainState.feedbackReverveGain.gain.setTargetAtTime(gain, currentTime, fade);
  // }
  // }
};

// counterbalance 用。加速度から求めた値を、既定ゲインを基準に
// feedbackMixGain への相対値へ変換する。これにより MASTER 配下の
// FEEDBACK 音量変更にも追従する。
export const feedbackLevel = (value: number, fade: number): void => {
  const currentTime = contextState.audioContext.currentTime;
  const reference = GAIN_DEFAULTS.FEEDBACK;
  const normalized = reference > 0 ? Math.max(0, value) / reference : 0;
  gainState.feedbackGain.gain.setTargetAtTime(normalized, currentTime, fade);
};
