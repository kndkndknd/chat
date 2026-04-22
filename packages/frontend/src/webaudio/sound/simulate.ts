import { flagState, gainState } from "../../state";

export const simulate = (gain: number) => {
  flagState.simulate = !flagState.simulate;
  console.log("simulate", flagState.simulate, "gain", gain);
  if (flagState.simulate) {
    // gainState.simulateMaxGain = gain;
    gainState.simulateGain.gain.setValueAtTime(gain, 0);
  } else {
    // gainState.simulateMaxGain = 0;
    gainState.simulateGain.gain.setValueAtTime(0, 0);
  }
};
