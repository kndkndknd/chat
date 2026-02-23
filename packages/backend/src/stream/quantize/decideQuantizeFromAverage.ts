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
export const decideQuantizeFromAverage = (
  argBpmClientObj: { [client: string]: bpmStreamStateType },
  argParams?: {
    bpm?: number;
    beat?: number;
    flag?: boolean;
  }
): { [client: string]: bpmStreamStateType } => {
  // let denominator = 0;
  let sumBpm = 0;
  let sumBeat = 0;
  // let sumGridFlag = 0;
  let sumQuantizeFlag = 0;

  const denominator = Object.keys(argBpmClientObj)
    .map((client) => {
      return Object.keys(argBpmClientObj[client]).length;
    })
    .reduce((a, b) => a + b, 0);
  console.log("denominator: ", denominator);

  for (const client in argBpmClientObj) {
    for (const stream in argBpmClientObj[client]) {
      sumBeat += argBpmClientObj[client][stream].beat;
      sumBpm += argBpmClientObj[client][stream].bpm;
      // sumGridFlag += argBpmClientObj[client].stream[stream].gridFlag ? 1 : 0;
      sumQuantizeFlag += argBpmClientObj[client][stream].quantizeFlag ? 1 : 0;
    }
  }
  const bpm =
    argParams === undefined || argParams.bpm === undefined
      ? sumBpm / denominator
      : argParams.bpm;
  const beat =
    argParams === undefined || argParams.beat === undefined
      ? Math.round(sumBeat / denominator)
      : argParams.beat;
  const quantizeFlag =
    argParams === undefined || argParams.flag === undefined
      ? sumQuantizeFlag > denominator / 2
        ? false
        : true
      : argParams.flag;

  for (const client in argBpmClientObj) {
    for (const stream in argBpmClientObj[client]) {
      argBpmClientObj[client][stream] = {
        bpm,
        beat,
        gridFlag: !quantizeFlag,
        quantizeFlag,
        latency: 60000 / bpm / beat,
      };
    }
  }

  return argBpmClientObj;
};
