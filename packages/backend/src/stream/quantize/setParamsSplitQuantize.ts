import { quantizeCmd } from "../../stream/quantize/quantizeCmd";
import {
  bpmStreamStateType,
  bpmClientStateType,
  quantizeObjType,
  quantizeParamClass,
} from "../../../../../types";
import { streamList } from "../../data";
import { bpmState, bpmStateDefault } from "../../state";
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
  target?: string
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
    target !== undefined && target !== "all"
      ? [target]
      : Object.keys(bpmStreamState);
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
  // const result: { [client: string]: bpmClientStateType } = JSON.parse(
  //   JSON.stringify(bpmState)
  /* パラメータなしの場合はquantizeFlagがコマンド前全部trueであればfalseに、そうでなければtrueにする。beat,bpmは変えない */
  // if (stringArr.length === 0) {
  //   if (target !== undefined && target !== "all") {
  //     const allFlag = Object.keys(bpmStreamState[target]).every(
  //       (key) => bpmStreamState[target][key].quantizeFlag === true
  //     );
  //     if (allFlag) {
  //       for (const stream in bpmState[target]) {
  //         bpmStreamState[target][stream].quantizeFlag = false;
  //       }
  //     } else {
  //       for (const stream in bpmState[target]) {
  //         bpmStreamState[target][stream].quantizeFlag = true;
  //         bpmStreamState[target][stream].gridFlag = false;
  //       }
  //     }
  //   } else {
  //     const allClientFlag = Object.keys(bpmStreamState).every((client) =>
  //       Object.keys(bpmStreamState[client]).every(
  //         (stream) => bpmStreamState[client][stream].quantizeFlag === true
  //       )
  //     );
  //     if (allClientFlag) {
  //       for (const client in bpmState) {
  //         for (const stream in bpmState[client]) {
  //           bpmState[client][stream].flag = false;
  //         }
  //       }
  //     } else {
  //       for (const client in bpmState) {
  //         for (const stream in bpmState[client]) {
  //           bpmState[client][stream].flag = true;
  //         }
  //       }
  //     }
  //   }
  // } else if (arrTypeArr[0] === "number") {
  //   // 数字パラメータが32の場合は
  //   if (Number(stringArr[0]) > 32) {
  //     if (target !== undefined && target !== "all") {
  //       for (const stream in bpmStreamState[target]) {
  //         bpmStreamState[target][stream].bpm = Number(stringArr[0]);
  //       }
  //     } else {
  //       for (const client in bpmStreamState) {
  //         for (const stream in bpmStreamState[client]) {
  //           bpmStreamState[client][stream].bpm = Number(stringArr[0]);
  //         }
  //       }
  //     }
  //   } else {
  //   }
  //   // if (arrTypeArr[0] === "number") {
  //   //   targetObj.streamTarget = "all";
  //   //   targetObj.clientTarget = target ? target : "all";
  //   //   parameter.beat = Number(stringArr[0]);
  //   // } else if (stringArr[0] === "TRUE" || stringArr[0] === "ON") {
  //   //   targetObj.streamTarget = "all";
  //   //   targetObj.clientTarget = target ? target : "all";
  //   //   parameter.flag = true;
  //   // } else if (stringArr[0] === "FALSE" || stringArr[0] === "OFF") {
  //   //   targetObj.streamTarget = "all";
  //   //   targetObj.clientTarget = target ? target : "all";
  //   //   parameter.flag = false;
  //   // } else if (
  //   //   arrTypeArr[0] === "string" &&
  //   //   (streamList.includes(stringArr[0]) || stringArr[0] === "CHAT")
  //   // ) {
  //   //   targetObj.streamTarget = stringArr[0];
  //   //   targetObj.clientTarget = target ? target : "all";
  //   //   parameter.beat = bpmStateDefault.beat;
  //   // }
  // } else if (stringArr.length === 2 && arrTypeArr[1] === "number") {
  //   // quantizeCmd(io, state, "all", target, Number(stringArr[1]));
  //   // quantizeCmd(io, state, "all", target, Number(stringArr[1]));
  //   if (target !== undefined) {
  //     targetObj.streamTarget = "all";
  //     targetObj.clientTarget = target;
  //     parameter.beat = Number(stringArr[1]);
  //     //
  //   } else {
  //     targetObj.streamTarget = "all";
  //     targetObj.clientTarget = "all";
  //     parameter.beat = Number(stringArr[1]);
  //   }
  // } else if (
  //   stringArr.length === 2 &&
  //   arrTypeArr[1] === "string" &&
  //   (streamList.includes(stringArr[1]) || stringArr[1] === "CHAT")
  // ) {
  //   // quantizeCmd(io, state, stringArr[2], target, 0);
  //   if (target !== undefined) {
  //     targetObj.streamTarget = stringArr[1];
  //     targetObj.clientTarget = target;
  //     parameter.beat = bpmStateDefault.beat;
  //     //
  //   } else {
  //     targetObj.streamTarget = stringArr[1];
  //     targetObj.clientTarget = "all";
  //     parameter.beat = bpmStateDefault.beat;
  //   }
  // } else if (stringArr.length === 2 && arrTypeArr[1] === "string") {
  //   if (stringArr[1] === "TRUE" || stringArr[1] === "ON") {
  //     targetObj.streamTarget = "all";
  //     targetObj.clientTarget = "all";
  //     parameter.flag = true;
  //   } else if (stringArr[1] === "FALSE" || stringArr[1] === "OFF") {
  //     targetObj.streamTarget = "all";
  //     targetObj.clientTarget = "all";
  //     parameter.flag = false;
  //   }
  // } else if (
  //   stringArr.length === 3 &&
  //   arrTypeArr[1] === "number" &&
  //   (streamList.includes(stringArr[2]) || stringArr[2] === "CHAT")
  // ) {
  //   // quantizeCmd(io, state, stringArr[3], target, Number(stringArr[2]));
  //   if (target !== undefined) {
  //     targetObj.streamTarget = stringArr[2];
  //     targetObj.clientTarget = target;
  //     parameter.beat = Number(stringArr[1]);
  //   } else {
  //     targetObj.streamTarget = stringArr[2];
  //     targetObj.clientTarget = "all";
  //     parameter.beat = Number(stringArr[1]);
  //   }
  // } else if (
  //   stringArr.length === 3 &&
  //   arrTypeArr[2] === "number" &&
  //   (streamList.includes(stringArr[1]) || stringArr[1] === "CHAT")
  // ) {
  //   // quantizeCmd(io, state, stringArr[1], target, Number(stringArr[2]));
  //   if (target !== undefined) {
  //     targetObj.streamTarget = stringArr[1];
  //     targetObj.clientTarget = target;
  //     parameter.beat = Number(stringArr[2]);
  //   } else {
  //     targetObj.streamTarget = stringArr[1];
  //     targetObj.clientTarget = "all";
  //     parameter.beat = Number(stringArr[2]);
  //   }
  // }
  // if (targetObj.clientTarget === "all") {
  //   for (const client in bpmState) {
  //     result[client] = bpmState[client];
  //   }
  // } else {
  //   result[targetObj.clientTarget] = bpmState[targetObj.clientTarget];
  // }
  // console.log("refultObj: ", result);

  // for (const client in result) {
  //   if (targetObj.streamTarget === "all") {
  //     for (const stream of streamList) {
  //       result[client][stream].beat =
  //         (parameter.beat as number) | result[client][stream].beat;
  //       result[client][stream].flag =
  //         (parameter.flag as boolean) !== undefined
  //           ? (parameter.flag as boolean)
  //           : result[client][stream].flag;
  //     }
  //   } else {
  //     result[client][targetObj.streamTarget].beat =
  //       (parameter.beat as number) |
  //       result[client][targetObj.streamTarget].beat;
  //     result[client][targetObj.streamTarget].flag =
  //       (parameter.flag as boolean) !== undefined
  //         ? (parameter.flag as boolean)
  //         : result[client][targetObj.streamTarget].flag;
  //   }
  // }

  // return result;
};
