import { bpmState } from "../state";
import { streamList } from "../data";
import { emitChangeBPM } from "../socket/ioEmit";

export const execChangeBPM = (bpm: number, option?: {target?: string, source?: string}) => {
  const { targetArr, sourceArr } = changeBPM(bpm, option);
  emitChangeBPM(bpm, targetArr, sourceArr);
}

const changeBPM = (bpm: number, option?: {target?: string, source?: string}): { targetArr: string[], sourceArr: string[] } => {
  const targetArr: string[] = [];
  const sourceArr: string[] = [];
  if(option !== undefined && option.target !== undefined && option.target && bpmState[option.target] !== undefined) {
    if(option.source !== undefined && option.source && (streamList.includes(option.source) || option.source === "METRONOME" || option.source === "MODULATION")) {
      sourceArr.push(option.source);
      bpmState[option.target].bpm = bpm;
    } else {
      for (const source in bpmState[option.target].stream) {
        sourceArr.push(source);
      }
      sourceArr.push("METRONOME");
      sourceArr.push("MODULATION");
      bpmState[option.target].bpm = bpm;
    }
    targetArr.push(option.target);
  } else if(option !== undefined && option.source === undefined && option.source && (streamList.includes(option.source) || option.source === "METRONOME" || option.source === "MODULATION")) {
    sourceArr.push(option.source);
    for (const client in bpmState) {
      targetArr.push(client);
      bpmState[client].bpm = bpm;
    }
  } else {
    for (const client in bpmState) {
      targetArr.push(client);
      bpmState[client].bpm = bpm;
    }
    for (const source in bpmState[targetArr[0]].stream) {
      sourceArr.push(source);
    }
    sourceArr.push("METRONOME");
    sourceArr.push("MODULATION");
  }
  return { targetArr, sourceArr };
}
