import { contextState } from "./contextState";
import { gainState } from "./gainState";
import { oscArrState } from "./oscArrState";

export const initAudio = () => {
  // console.log("debug1");
  contextState.audioContext = new AudioContext();
  gainState.masterGain = contextState.audioContext.createGain();
  gainState.masterGain.gain.setValueAtTime(1, 0);
  gainState.masterGain.connect(contextState.audioContext.destination);
  // sinewave
  oscArrState[0] = contextState.audioContext.createOscillator();
  gainState.oscGain[0] = contextState.audioContext.createGain();
  oscArrState[0].connect(gainState.oscGain[0]);
  oscArrState[0].frequency.setValueAtTime(440, 0);
  gainState.oscGain[0].gain.setValueAtTime(0, 0);
  gainState.oscGain[0].connect(gainState.masterGain);
  oscArrState[0].start(0);
};
