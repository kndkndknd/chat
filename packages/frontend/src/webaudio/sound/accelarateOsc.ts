import { contextState, oscState, gainState } from "../../state";

export const accelarateOsc = (
  flag: boolean,
  frequency: number,
  fade: number,
  portament: number,
  gain: number
) => {
  console.log("debug3");
  const currentTime = contextState.audioContext.currentTime;
  console.log("debug");
  oscState.accelarateOsc.frequency.setTargetAtTime(
    frequency,
    currentTime,
    portament
  );
  if (flag) {
    gainState.oscGain.gain.setTargetAtTime(gain, currentTime, fade);
  } else {
    gainState.oscGain.gain.setTargetAtTime(0, currentTime, fade);
  }
};
