import { flagState, gainState } from "../../state";

export const simulate = (gain: number) => {
  flagState.simulate = !flagState.simulate;
  console.log("simulate", flagState.simulate, "gain", gain);
  if (flagState.simulate) {
    // 音量は simulateMixGain が担当する。
    gainState.simulateGain.gain.setValueAtTime(1, 0);
  } else {
    gainState.simulateGain.gain.setValueAtTime(0, 0);
  }
};
