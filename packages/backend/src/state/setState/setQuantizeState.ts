import { quantizeState } from "../../state";

export const setQuantizeState = (
  streamArr: string[],
  clientArr: string[],
  bpm: number,
  beat: number,
  flag: boolean
) => {
  for (const stream of streamArr) {
    if (quantizeState[stream] === undefined) {
      quantizeState[stream] = {};
    }
    for (const client of clientArr) {
      if (quantizeState[stream][client] === undefined) {
        quantizeState[stream][client] = {
          flag: flag,
          bpm: bpm,
          beat: beat,
        };
      } else {
        quantizeState[stream][client] = {
          flag: flag,
          bpm: bpm,
          beat: beat,
        };
      }
    }
  }

  console.log("quantizeState", quantizeState);
};
