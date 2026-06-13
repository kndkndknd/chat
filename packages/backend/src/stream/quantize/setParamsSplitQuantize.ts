import {
  bpmStreamStateType,
  quantizeParamClass,
} from "../../../../../types";
import { streamList } from "../../data";
import { bpmState } from "../../state";
/*
クライアント指定は (クライアントID or ALL) QUANTISE
ストリーム指定は QUANTIZE (ストリーム名 or ALL)
ビート指定は QUANTIZE (ビート or 0)
ON/OFF指定は QUANTIZE (ON/TRUE or OFF/FALSE)
)
*/
// splitQuantizeの中でsetParamsSplitQuantizeを呼び出している。
// setParamsSplitQuantizeはstringArr, arrTypeArr, targetを受け取って、{client: bpmClientStateType}を返す。

// ターゲットについてはtargetに入ってる。下記targetを除いたstringArr
// stringArr.length === 1 => quantizeCmd(io, state, "all", target, 0);
// stringArr.length === 2 && 1つめがnumber === "number" => quantizeCmd(io, state, "all", target, Number(stringArr[1]));
// stringArr.length === 2 && 1つめがstringでstream => quantizeCmd(io, state, stringArr[2], target, 0);
// stringArr.length === 3 && 1つめがnumberで2つ目がstream  => quantizeCmd(io, state, stringArr[3], target, Number(stringArr[1]));
// stringArr.length === 3 && 1つめがstreamで2つ目がnumber => quantizeCmd(io, state, stringArr[1], target, Number(stringArr[2]));
export const setParamsSplitQuantize = (
  params: quantizeParamClass,
  target?: string[]
): { [client: string]: bpmStreamStateType } => {
  console.log("target: ", target);
  // const targetObj: { streamTarget: string; clientTarget: string } = {
  //   streamTarget: "",
  //   clientTarget: "",
  // };
  // const result: { [client: string]: bpmClientStateType } = {};
  // const parameter: { [key: string]: number | boolean } = { flag: true };
  const bpmStreamState: { [client: string]: bpmStreamStateType } = {};
  for (const client in bpmState) {
    bpmStreamState[client] = {
      ...bpmState[client].stream,
    };
  }

  const targetClient =
    target !== undefined && !target.includes('all') ? target : Object.keys(bpmStreamState);
  const targetStream =
    params.stream !== undefined ? [params.stream] : streamList;
  const flag: boolean =
    params.flag !== undefined
      ? params.flag
      : Object.keys(bpmStreamState).every(
          (client) =>
            targetClient.includes(client) &&
            Object.keys(bpmStreamState[client]).every(
              (stream) =>
                targetStream.includes(stream) &&
                bpmStreamState[client][stream].quantizeFlag === true
            )
        );

  for (const client in bpmStreamState) {
    if (targetClient.includes(client)) {
      for (const stream of streamList) {
        if (targetStream.includes(stream)) {
          bpmStreamState[client][stream].quantizeFlag = flag;
          if (params.beat !== undefined) {
            bpmStreamState[client][stream].beat = params.beat;
          }
          if (params.bpm !== undefined) {
            bpmStreamState[client][stream].bpm = params.bpm;
          }
          if (flag) {
            bpmStreamState[client][stream].gridFlag = false;
          }
        }
      }
    }
  }
  return bpmStreamState;
};
