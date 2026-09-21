import { bpmState } from "../state";
import { ioState } from "../state/states/ioState";
import { streamList } from "../data";

export const changeBPM = (bpm: number, option?: {target?: string, source?: string}) => {
  const targetArr: string[] = [];
  const sourceArr: string[] = [];
  if(option !== undefined && option.target !== undefined && option.target && bpmState[option.target] !== undefined) {
    if(option.source !== undefined && option.source && (streamList.includes(option.source) || option.source === "METRONOME" || option.source === "MODULATION")) {
      sourceArr.push(option.source);
      if(option.source === "METRONOME" || option.source === "MODULATION") {
        bpmState[option.target].bpm = bpm;
      } else {
        bpmState[option.target].bpm = bpm;
      }
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
      if(option.source === "METRONOME" || option.source === "MODULATION") {
        bpmState[client].bpm = bpm;
      } else {
        bpmState[client].bpm = bpm;
      }
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

  emitChangeBPM(bpm, targetArr, sourceArr);
}

const emitChangeBPM = (bpm: number, targetArr: string[], sourceArr: string[]) => {
  if(ioState?.io) {
    for (const target of targetArr) {
      ioState.io.to(target).emit("bpmFromServer", { bpm: bpm, source: sourceArr });
    }
  }
};
