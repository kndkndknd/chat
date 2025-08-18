import { bpmState, bpmClientStateType } from "../backend/src/state";
import { streamList } from "../backend/src/data";

export const averageBpmInfo = (): bpmClientStateType => {
  if (Object.keys(bpmState).length === 0) {
    const defaultBpmInfo = {
      stream: {
        CHAT: {
          bpm: 60,
          beat: 0,
          gridFlag: false,
          quantizeFlag: false,
          latency: 1000,
        },
      },
      METRONOME: { bpm: 60, beat: 4, flag: false },
      MODULATION: { bpm: 60, beat: 4, flag: false },
    };
    for (const stream of streamList) {
      defaultBpmInfo.stream[stream] = {
        bpm: 60,
        beat: 0,
        gridFlag: false,
        quantizeFlag: false,
        latency: 1000,
      };
    }
    return defaultBpmInfo;
  } else {
    let diatonic = 0;
    let sumBpmInfo = {
      METRONOME: { bpm: 0, beat: 0, flag: false },
      MODULATION: { bpm: 0, beat: 0, flag: false },
      stream: {
        CHAT: {
          bpm: 0,
          beat: 0,
          gridFlag: false,
          quantizeFlag: false,
          latency: 0,
        },
      },
    };
    for (let client in bpmState) {
      sumBpmInfo.METRONOME.bpm += bpmState[client].METRONOME.bpm;
      sumBpmInfo.METRONOME.beat += bpmState[client].METRONOME.beat;
      sumBpmInfo.MODULATION.bpm += bpmState[client].MODULATION.bpm;
      sumBpmInfo.MODULATION.beat += bpmState[client].MODULATION.beat;
      for (let stream in bpmState[client].stream) {
        sumBpmInfo.stream[stream].bpm += bpmState[client].stream[stream].bpm;
        sumBpmInfo.stream[stream].beat += bpmState[client].stream[stream].beat;
        sumBpmInfo.stream[stream].latency +=
          bpmState[client].stream[stream].latency;
      }
      diatonic += 1;
    }
    for (let key in sumBpmInfo) {
      if (key !== "stream") {
        sumBpmInfo[key].bpm /= diatonic;
        sumBpmInfo[key].beat /= diatonic;
      } else {
        for (let stream in sumBpmInfo.stream) {
          sumBpmInfo.stream[stream].bpm /= diatonic;
          sumBpmInfo.stream[stream].beat /= diatonic;
          sumBpmInfo.stream[stream].latency /= diatonic;
        }
      }
    }
    return sumBpmInfo;
  }
};
