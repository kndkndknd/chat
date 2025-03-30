import { flagState, gainState } from "../state";
export const simulate = (gain) => {
    flagState.simulate = !flagState.simulate;
    if (flagState.simulate) {
        gainState.simulateMaxGain = gain;
    }
    else {
        gainState.simulateMaxGain = 0;
        gainState.simulateGain.gain.setValueAtTime(0, 0);
    }
};
