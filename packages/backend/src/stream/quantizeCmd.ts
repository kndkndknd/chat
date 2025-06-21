import { millisecondsPerBar } from "../../../util/bpmCalc";
import { quantizeObjType } from "../../../../types";
import {
  clientState,
  bpmState,
  // quantizeState,
  setQuantizeState,
} from "../state";
// import { decideQuantizeFromAverage } from "./quantizeModule/decideQuantizeFromAverage";
import { streamList } from "../data";

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
  console.log("quantizeCmd, debug", flag, bpm, bar, beat);

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
  // console.log("quantizeState", quantizeState);
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
  // let sumGridFlag = 0;
  let sumQuantizeFlag = 0;
  for (const streamEl of streamArr) {
    for (const clientEl of clientArr) {
      denominator++;
      if (bpmState[clientEl].stream[streamEl] !== undefined) {
        sumBpm += bpmState[clientEl].stream[streamEl].bpm;
        sumBeat += bpmState[clientEl].stream[streamEl].beat;
        // sumGridFlag += bpmState[clientEl].stream[streamEl].gridFlag ? 1 : 0;
        sumQuantizeFlag += bpmState[clientEl].stream[streamEl].quantizeFlag
          ? 1
          : 0;
      } else {
        sumBpm += bpmState[clientEl].METRONOME.bpm;
        sumBeat += bpmState[clientEl].METRONOME.beat;
        // sumGridFlag += bpmState[clientEl].METRONOME.flag ? 1 : 0;
        sumQuantizeFlag += bpmState[clientEl].METRONOME.flag ? 1 : 0;
      }
    }
  }
  console.log("sumFlag", sumQuantizeFlag, "denominator", denominator);
  console.log("argFlag", argFlag, "argBpm", argBpm, "argBeat", argBeat);
  const returnBpm = sumBpm / denominator;
  const returnBeat = sumBeat === 0 ? 0 : Math.round(sumBeat / denominator);
  const returnQuantizeFlag =
    sumQuantizeFlag === 0 || sumQuantizeFlag * 2 < denominator ? true : false;
  console.log("returnFlag", returnQuantizeFlag);

  return {
    bpm: argBpm === undefined || argBpm === 0 ? returnBpm : argBpm,
    bar:
      argBpm === undefined || argBpm === 0
        ? millisecondsPerBar(returnBpm)
        : millisecondsPerBar(argBpm),
    beat: argBeat === undefined ? returnBeat : argBeat,
    flag:
      argFlag !== undefined
        ? argFlag
        : (argBpm !== undefined && argBpm !== 0 && argBpm !== returnBpm) ||
          (argBeat !== undefined && argBeat !== returnBeat) ||
          (argFlag !== undefined && argFlag) ||
          returnQuantizeFlag
        ? true
        : false,
  };
};
