import { contextState, gainState } from "../../state";
export const whitenoise = (flag, fade, gain) => {
    const currentTime = contextState.audioContext.currentTime;
    console.log("currentTime", currentTime);
    console.log("fade", fade);
    console.log("gain", gain);
    if (flag) {
        gainState.whitenoiseGain.gain.setTargetAtTime(gain, currentTime, fade);
    }
    else {
        gainState.whitenoiseGain.gain.setTargetAtTime(0, currentTime, fade);
    }
};
