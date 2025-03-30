import { millisecondsPerBar } from "../cmd/bpmCalc";
import { quantizeObjType } from "../../../../types";
import { streamList, clientState } from "../states";
// import { decideQuantizeFromAverage } from "./quantizeModule/decideQuantizeFromAverage";
import { bpmState } from "../states";
import { quantizeState, setQuantizeState } from "../state";

export const quantizeCmd = (
  // io: SocketIO.Server,
  streamTarget: string,
  clientTarget: string,
  parameter?: {
    beat?: number;
    bpm?: number;
    flag?: boolean;
  }
): quantizeObjType => {
  const streamArr =
    streamTarget !== "all" ? [streamTarget] : ["CHAT", ...streamList];
  const clientArr =
    clientTarget !== "all" ? [clientTarget] : Object.keys(clientState.client);
  const { bpm, bar, beat, flag } = decideQuantizeFromAverage(
    streamArr,
    clientArr,
    parameter.beat,
    parameter.bpm,
    parameter.flag
  );

  setQuantizeState(streamArr, clientArr, bpm, beat, flag);

  const quantizeObj = {
    flag: flag,
    stream: streamArr,
    target: clientArr,
    bpm: bpm,
    bar: parameter.bpm !== undefined ? millisecondsPerBar(bpm) : bar,
    beat: parameter.beat !== undefined ? parameter.beat : beat,
  };
  console.log("quantizeObj", quantizeObj);
  console.log("quantizeState", quantizeState);
  return quantizeObj;
};

// quantizeObjへのbpm, barのセットと、quantizeStateの更新
const decideQuantizeFromAverage = (
  streamArr: string[],
  clientArr: string[],
  argBpm: number | undefined,
  argBeat: number | undefined,
  argFlag?: boolean | undefined
): { bpm: number; bar: number; beat: number; flag: boolean } => {
  let denominator = 0;
  let sumBpm = 0;
  let sumBeat = 0;
  let sumFlag = 0;
  for (const streamEl of streamArr) {
    for (const clientEl of clientArr) {
      denominator++;
      if (
        quantizeState[streamEl] !== undefined &&
        quantizeState[streamEl][clientEl] !== undefined
      ) {
        sumBpm += quantizeState[streamEl][clientEl].bpm;
        sumBeat += quantizeState[streamEl][clientEl].beat;
        sumFlag += quantizeState[streamEl][clientEl].flag ? 1 : 0;
      } else {
        sumBpm += bpmState.METRONOME;
      }
    }
  }
  console.log("sumFlag", sumFlag, "denominator", denominator);
  console.log("argFlag", argFlag, "argBpm", argBpm, "argBeat", argBeat);
  const returnBpm = sumBpm / denominator;
  const returnBeat = sumBeat === 0 ? 0 : Math.round(sumBeat / denominator);
  const returnFlag = sumFlag === 0 || sumFlag * 2 < denominator ? true : false;
  console.log("returnFlag", returnFlag);

  return {
    bpm: argBpm === undefined || argBpm === 0 ? returnBpm : argBpm,
    bar:
      argBpm === undefined || argBpm === 0
        ? millisecondsPerBar(returnBpm)
        : millisecondsPerBar(argBpm),
    beat: argBeat === undefined ? returnBeat : argBeat,
    flag:
      (argBpm !== undefined && argBpm !== 0 && argBpm !== returnBpm) ||
      (argBeat !== undefined && argBeat !== returnBeat) ||
      (argFlag !== undefined && argFlag) ||
      returnFlag
        ? true
        : false,
  };
};
