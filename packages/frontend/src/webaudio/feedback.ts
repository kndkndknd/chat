import { contextState, gainState } from "../state";

export const feedback = (
  flag: boolean,
  fade: number,
  gain: number,
  type?: "normal" | "reverve"
) => {
  const currentTime = contextState.audioContext.currentTime;
  // if (type === undefined || type === "normal") {
  if (flag) {
    gainState.feedbackGain.gain.setTargetAtTime(gain, currentTime, fade);
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
