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
  // CHAT は streamList に含まれないが、引数で明示された場合は対象にする。
  const quantizeStreamList = ["CHAT", ...streamList];
  // ALL は CHAT と UPLOAD 等で追加された stream を含む全ストリーム。
  const targetStream =
    params.stream === undefined
      ? streamList
      : params.stream === "ALL"
        ? quantizeStreamList
        : [params.stream];
  // 対象クライアント・対象ストリームだけを見て flag を決める。
  // bpmState には CHAT や UPLOAD で追加された stream も含まれるため、
  // 全キーを every で見ると対象外の stream に引きずられてしまう。
  const targetClients = Object.keys(bpmStreamState).filter((client) =>
    targetClient.includes(client)
  );
  const targetStreams = quantizeStreamList.filter((stream) =>
    targetStream.includes(stream)
  );
  const flag: boolean =
    params.flag !== undefined
      ? params.flag
      : targetClients.every((client) =>
          targetStreams.every(
            (stream) =>
              bpmStreamState[client][stream]?.quantizeFlag === true
          )
        );

  for (const client of targetClients) {
    for (const stream of targetStreams) {
      const streamState = bpmStreamState[client][stream];
      if (streamState === undefined) {
        continue;
      }
      streamState.quantizeFlag = flag;
      if (params.beat !== undefined) {
        streamState.beat = params.beat;
      }
      // if (params.bpm !== undefined) {
      //   bpmStreamState[client][stream].bpm = params.bpm;
      // }
      if (flag) {
        streamState.gridFlag = false;
      }
    }
  }
  return bpmStreamState;
};
