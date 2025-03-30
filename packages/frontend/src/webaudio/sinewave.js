import { contextState, oscState, gainState } from "../state";
export const sinewave = (flag, frequency, fade, portament, gain) => {
    console.log("debug3");
    const currentTime = contextState.audioContext.currentTime;
    console.log("debug");
    oscState.osc.frequency.setTargetAtTime(frequency, currentTime, portament);
    if (flag) {
        gainState.oscGain.gain.setTargetAtTime(gain, currentTime, fade);
    }
    else {
        gainState.oscGain.gain.setTargetAtTime(0, currentTime, fade);
    }
};
