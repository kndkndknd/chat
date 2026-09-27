import { metronomeState } from "../../state";
import { textPrint } from "../../canvasEvent";
import { click } from "./click";

export const metronome = (flag: boolean, latency: number, gain: number) => {
  metronomeState.bar = 4 * latency;
  if (!metronomeState.intervalId) {
    console.log("metronome init");
    textPrint("METRONOME");
    metronomeState.intervalId = window.setInterval(() => {
      console.log("metronome");
      console.log(gain);
      click(gain, 440);
      textPrint("CLICK", { timeout: true });
      // setTimeout(() => {
      //   erasePrint();
      // }, 500);
    }, latency);
  } else if (flag) {
    textPrint("METRONOME");
    console.log("metronome change");
    clearInterval(metronomeState.intervalId);
    metronomeState.intervalId = window.setInterval(() => {
      click(gain, 440);
      textPrint("CLICK", { timeout: true });
      // setTimeout(() => {
      //   erasePrint();
      // }, 500);
    }, latency);
  } else {
    console.log("metronome stop");
    clearInterval(metronomeState.intervalId);
  }
};
