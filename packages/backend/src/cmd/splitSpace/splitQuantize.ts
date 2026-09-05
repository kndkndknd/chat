import {
  setParamsSplitQuantize,
  setBpmState,
  emitQuantize,
} from "../../stream/quantize";
import { stringEmit } from "../../socket/ioEmit";
import { streamList } from "../../data";
import { bpmState, bpmStateDefault } from "../../state";



// 入力2番の候補
// const streamList = ["CHAT", "PLAYBACK", "TIMELAPSE"] as const;
type Stream = (typeof streamList)[number];

type quantizeParamClass = Partial<{
  flag: boolean; // 要素① "TRUE"/"FALSE" -> boolean
  stream: Stream; // 要素② streamListのいずれか
  beat: number; // 要素③ 数値文字列かつ <= 32
  bpm: number; // 要素④ 数値文字列かつ >= 33
}>;

/**
 * 与えられた配列(長さ0〜4, 順不同)から分類オブジェクトを作る
 * - カテゴリごとに最初に一致した要素のみ採用
 * - 不一致や欠損は無視 (プロパティ未生成)
 * - [] の場合は {} を返す
 */
export function classifyArgs(input: string[]): quantizeParamClass {
  const params: quantizeParamClass = {};
  if (!Array.isArray(input) || input.length === 0) return params;

  for (const raw of input) {
    // 事前正規化
    const trimmed = String(raw).trim();
    const upper = trimmed.toUpperCase();

    // ① TRUE/FALSE
    if (params.flag === undefined && (upper === "TRUE" || upper === "FALSE")) {
      params.flag = upper === "TRUE";
      continue;
    }

    // ② stream
    if (
      params.stream === undefined &&
      (streamList as readonly string[]).includes(upper)
    ) {
      params.stream = upper as Stream;
      continue;
    }

    // ③④ 数値文字列の判定
    if (/^\d+$/.test(trimmed)) {
      const n = Number(trimmed);
      if (params.beat === undefined && n <= 32) {
        params.beat = n;
        continue;
      }
      if (params.bpm === undefined && n >= 33) {
        params.bpm = n;
        continue;
      }
    }
    // どれにも該当しない要素は捨てる
  }

  return params;
}

export const splitQuantize = (paramArr, target?: string | string[]) => {
  console.log("debug quantize", paramArr);
  console.log("debug bpmState", bpmState);
  if (
    (paramArr.length === 1 && paramArr[0] === "HELP") ||
    paramArr[0] === "?"
  ) {
    const strings = `QUANTIZE (stream or ALL) (beat or 0) (ON/TRUE or OFF/FALSE)`;
    stringEmit(strings, false);
  } else if (paramArr.length === 0 && target !== undefined && target) {
    const quantizeObj = {};
    if(bpmState[target as string].stream !== undefined && bpmState[target as string].stream) {
      quantizeObj[target as string] = bpmState[target as string].stream;
    } else {
      quantizeObj[target as string] = {};
      streamList.forEach((stream) => {
        quantizeObj[target as string][stream] = {
          bpm: bpmStateDefault.bpm,
          beat: bpmStateDefault.beat,
          quantizeFlag: bpmStateDefault.quantizeFlag,
        };
      });
    }
    let sum = 0;
    for (const stream in quantizeObj[target as string]) {
      if (quantizeObj[target as string][stream].quantizeFlag) {
        sum++;
      }
    }
    console.log("sum", sum);
    console.log("length", Object.keys(quantizeObj[target as string]).length);
    const flag: boolean = sum / Object.keys(quantizeObj[target as string]).length > 0.5 ? false : true;
    for (const stream in quantizeObj[target as string]) {
      quantizeObj[target as string][stream].quantizeFlag = flag;
    }
    console.log("splitQuantize return: ", quantizeObj);
    setBpmState(quantizeObj);
    emitQuantize(quantizeObj);
  } else {
    const params = classifyArgs(paramArr);
    
    const targetClientArr: string[] = target !== undefined ? (Array.isArray(target) ? target : [target]) : ['all'];
    const quantizeObj = setParamsSplitQuantize(params, targetClientArr);
    console.log("splitQuantize return: ", quantizeObj);
    setBpmState(quantizeObj);
    emitQuantize(quantizeObj);

    // io.emit("quantizeFromServer", quantizeObj);
  }
};
