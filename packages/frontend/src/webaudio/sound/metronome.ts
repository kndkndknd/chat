import { metronomeState } from "../../state";
import { textPrint } from "../../canvasEvent";
import { click } from "./click";

export const metronome = (flag: boolean, latency: number, gain: number) => {
  if (!metronomeState.intervalId) {
    console.log("metronome init");
    textPrint("METRONOME");
    metronomeState.intervalId = window.setInterval(() => {
      console.log("metronome");
      console.log(gain);
      click(gain);
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
      click(gain);
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
