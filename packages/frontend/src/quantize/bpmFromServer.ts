import { quantizeState, metronomeState } from "../state";
import { millisecondsPerBar } from "../util/bpmCalc";
import { refreshQuantizeInterval } from "./quantizeFromServer";

export const bpmFromServer = (data: {
  bpm: number;
  source: string[];
}): void => {
  if (data?.source === undefined || !Array.isArray(data.source)) {
    return;
  }

  let streamBarChanged = false;
  for (const source of data.source) {
    if (source === "METRONOME") {
      metronomeState.bar = millisecondsPerBar(data.bpm);
    } else if (source !== "MODULATION") {
      quantizeState.bar = millisecondsPerBar(data.bpm);
      streamBarChanged = true;
    }
  }

  if (streamBarChanged) {
    refreshQuantizeInterval(true);
  }
};
