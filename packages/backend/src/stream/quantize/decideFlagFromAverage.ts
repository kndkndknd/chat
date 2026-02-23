import { bpmStreamStateType } from "../../../../../types/bpmType";

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
export const decideFlagFromAverage = (
  argBpmClientObj: {
    [client: string]: bpmStreamStateType;
  },
  clientTarget: string,
  streamTarget: string
): boolean => {
  let sumQuantizeFlag = 0;

  const denominator = Object.keys(argBpmClientObj)
    .map((client) => {
      return Object.keys(argBpmClientObj[client]).length;
    })
    .reduce((a, b) => a + b, 0);
  console.log("denominator: ", denominator);

  for (const client in argBpmClientObj) {
    if (clientTarget === "all" || client === clientTarget) {
      for (const stream in argBpmClientObj[client]) {
        if (streamTarget === "all" || stream === streamTarget) {
          sumQuantizeFlag += argBpmClientObj[client][stream].quantizeFlag
            ? 1
            : 0;
        }
      }
    }
  }
  console.log("sumQuantizeFlag: ", sumQuantizeFlag);
  console.log(
    "denominator / 2: ",
    sumQuantizeFlag > denominator / 2 ? false : true
  );
  return sumQuantizeFlag > denominator / 2 ? false : true;
  // for (const client in argBpmClientObj) {
  //   for (const stream in argBpmClientObj[client]) {
  //     argBpmClientObj[client][stream].quantizeFlag = quantizeFlag;
  //   }
  // }

  // return argBpmClientObj;
};
