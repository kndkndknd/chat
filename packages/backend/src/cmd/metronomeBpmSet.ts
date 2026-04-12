import { clientState, bpmState } from "../state";
import { stringEmit } from "../socket/ioEmit";

const metronomeArr: number[] = [];

export const metronomeBpmSet = (sourceId: string) => {
  if (Object.keys(clientState.client).includes(sourceId)) {
    if (metronomeArr.length === 3) {
      const interval1 = metronomeArr[1] - metronomeArr[0];
      const interval2 = metronomeArr[2] - metronomeArr[1];
      const interval3 = new Date().getTime() - metronomeArr[2];
      const latency = (interval1 + interval2 + interval3) / 3;
      // state.bpm[sourceId] = 60000 / latency;
      // for (let target in state.stream.latency) {
      //   state.stream.latency[target] = latency;
      // }
      // for (let target in state.cmd.METRONOME) {
      //   state.cmd.METRONOME[target] = latency;
      // }
      // cmdState.METRONOME[sourceId] = latency;
      const bpm = 60000 / latency;
      for (const client in bpmState) {
        bpmState[client].METRONOME.bpm = bpm;
        bpmState[client].MODULATION.bpm = bpm;
        for (const stream in bpmState[client].stream) {
          bpmState[client].stream[stream].bpm = bpm;
        }
      }

      const targetIndex = Object.keys(clientState.client).map(
        (element, index) => {
          if (element === sourceId) return index;
        },
      );

      stringEmit(
        `${String(targetIndex)} BPM: ${String(60000 / latency)}`,
        true,
        sourceId,
      );

      // gridをきかせる制御

      metronomeArr.length = 0;
    } else {
      metronomeArr.push(new Date().getTime());
      let tapLength = Number(metronomeArr.length);
      setTimeout(() => {
        if (metronomeArr.length === tapLength) metronomeArr.length = 0;
      }, 10000);
    }
  }
  console.log(metronomeArr);
};
