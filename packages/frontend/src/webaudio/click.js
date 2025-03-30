import { contextState, oscState, gainState } from "../state";
export const click = (gain, frequency) => {
    const currentTime = contextState.audioContext.currentTime;
    if (frequency) {
        oscState.clickOsc.frequency.setValueAtTime(frequency, 0);
    }
    else {
        oscState.clickOsc.frequency.setValueAtTime(440, 0);
    }
    gainState.clickGain.gain.setValueAtTime(gain, 0);
    gainState.clickGain.gain.setTargetAtTime(0, currentTime, 0.03);
};
