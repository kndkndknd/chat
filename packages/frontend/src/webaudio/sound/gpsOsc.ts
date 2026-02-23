import { contextState, oscState, gainState } from "../../state";

export const gpsOsc = (
  flag: boolean,
  frequency: number,
  fade: number,
  portament: number,
  gain: number
) => {
  console.log("debug3");
  const currentTime = contextState.audioContext.currentTime;
  console.log("debug");
  oscState.gpsOsc.frequency.setTargetAtTime(frequency, currentTime, portament);
  if (flag) {
    gainState.gpsOscGain.gain.setTargetAtTime(gain, currentTime, fade);
  } else {
    gainState.gpsOscGain.gain.setTargetAtTime(0, currentTime, fade);
  }
};
