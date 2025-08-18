import { bpmState } from "../../state";
import { millisecondsPerBar } from "../../../../util/bpmCalc";

// quantizeObjへのbpm, barのセット

/**
 * クオンタイズ設定のための平均値を算出する関数
 * @param streamArr 対象とするストリーム名の配列
 * @param clientArr 対象とするクライアントIDの配列
 * @param argBpm オプションのBPM値（undefinedの場合は平均値を使用）
 * @param argBeat オプションのビート数（undefinedの場合は平均値を使用）
 * @param argFlag オプションのフラグ（undefinedの場合は平均値を使用）
 * @returns { bpm: number; bar: number; beat: number; flag: boolean }
 * @description この関数は、指定されたストリームとクライアントのBPMとビート数の平均値を計算し、
 * オプションで指定された値を使用してクオンタイズ設定を決定します。
 * argBpm, argBeat, argFlagが指定されない場合、平均値を基にしたクオンタイズ設定が行われます。
 * また、フラグは、平均値に基づいて計算され、必要に応じてtrueまたはfalseに設定されます。
 */
export const decideQuantizeFromAverage = (
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
