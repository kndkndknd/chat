import { bpmState } from "../state/states/bpmState";
import { millisecondsPerBeat } from "../../../util/bpmCalc";

export const gridTimeoutVal = (stream: string, targetId: string): number => {
  return bpmState[targetId].stream[stream] !== undefined &&
    Object.keys(bpmState[targetId].stream).includes(stream)
    ? (Math.round(Math.random() * 16) *
        millisecondsPerBeat(bpmState[targetId].stream[stream].bpm)) /
        4
    : (Math.round(Math.random() * 16) *
        millisecondsPerBeat(bpmState[targetId].METRONOME.bpm)) /
        4;
};
