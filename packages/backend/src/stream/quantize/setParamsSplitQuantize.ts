import { quantizeCmd } from "../../stream/quantize/quantizeCmd";
import {
  bpmStreamStateType,
  bpmClientStateType,
  quantizeObjType,
} from "../../../../../types";
import { streamList } from "../../data";
import { bpmState, bpmStateDefault } from "../../state";

// ターゲットについてはtargetに入ってる。下記targetを除いたstringArr
// stringArr.length === 1 => quantizeCmd(io, state, "all", target, 0);
// stringArr.length === 2 && 1つめがnumber === "number" => quantizeCmd(io, state, "all", target, Number(stringArr[1]));
// stringArr.length === 2 && 1つめがstringでstream => quantizeCmd(io, state, stringArr[2], target, 0);
// stringArr.length === 3 && 1つめがnumberで2つ目がstream  => quantizeCmd(io, state, stringArr[3], target, Number(stringArr[1]));
// stringArr.length === 3 && 1つめがstreamで2つ目がnumber => quantizeCmd(io, state, stringArr[1], target, Number(stringArr[2]));
export const setParamsSplitQuantize = (
  stringArr: string[],
  arrTypeArr: string[],
  target?: string
): { [client: string]: bpmClientStateType } => {
  console.log("splitQuantize: ", stringArr);
  console.log("arrTypeArr: ", arrTypeArr);
  console.log("target: ", target);
  const targetObj: { streamTarget: string; clientTarget: string } = {
    streamTarget: "",
    clientTarget: "",
  };
  const result: { [client: string]: bpmClientStateType } = {};
  const parameter: { [key: string]: number | boolean } = { flag: true };

  if (stringArr.length === 1) {
    if (target !== undefined) {
      targetObj.streamTarget = "all";
      targetObj.clientTarget = target;
      parameter.beat = bpmStateDefault.beat;
      // return quantizeCmd(
      //   { streamTarget: "all", clientTarget: target },
      //   { beat: 0 }
      // );
    } else {
      targetObj.streamTarget = "all";
      targetObj.clientTarget = "all";
    }
  } else if (stringArr.length === 2 && arrTypeArr[1] === "number") {
    // quantizeCmd(io, state, "all", target, Number(stringArr[1]));
    // quantizeCmd(io, state, "all", target, Number(stringArr[1]));
    if (target !== undefined) {
      targetObj.streamTarget = "all";
      targetObj.clientTarget = target;
      parameter.beat = Number(stringArr[1]);
      //
    } else {
      targetObj.streamTarget = "all";
      targetObj.clientTarget = "all";
      parameter.beat = Number(stringArr[1]);
    }
  } else if (
    stringArr.length === 2 &&
    arrTypeArr[1] === "string" &&
    (streamList.includes(stringArr[1]) || stringArr[1] === "CHAT")
  ) {
    // quantizeCmd(io, state, stringArr[2], target, 0);
    if (target !== undefined) {
      targetObj.streamTarget = stringArr[1];
      targetObj.clientTarget = target;
      parameter.beat = bpmStateDefault.beat;
      //
    } else {
      targetObj.streamTarget = stringArr[1];
      targetObj.clientTarget = "all";
      parameter.beat = bpmStateDefault.beat;
    }
  } else if (stringArr.length === 2 && arrTypeArr[1] === "string") {
    if (stringArr[1] === "TRUE" || stringArr[1] === "ON") {
      targetObj.streamTarget = "all";
      targetObj.clientTarget = "all";
      parameter.flag = true;
    } else if (stringArr[1] === "FALSE" || stringArr[1] === "OFF") {
      targetObj.streamTarget = "all";
      targetObj.clientTarget = "all";
      parameter.flag = false;
    }
  } else if (
    stringArr.length === 3 &&
    arrTypeArr[1] === "number" &&
    (streamList.includes(stringArr[2]) || stringArr[2] === "CHAT")
  ) {
    // quantizeCmd(io, state, stringArr[3], target, Number(stringArr[2]));
    if (target !== undefined) {
      targetObj.streamTarget = stringArr[2];
      targetObj.clientTarget = target;
      parameter.beat = Number(stringArr[1]);
    } else {
      targetObj.streamTarget = stringArr[2];
      targetObj.clientTarget = "all";
      parameter.beat = Number(stringArr[1]);
    }
  } else if (
    stringArr.length === 3 &&
    arrTypeArr[2] === "number" &&
    (streamList.includes(stringArr[1]) || stringArr[1] === "CHAT")
  ) {
    // quantizeCmd(io, state, stringArr[1], target, Number(stringArr[2]));
    if (target !== undefined) {
      targetObj.streamTarget = stringArr[1];
      targetObj.clientTarget = target;
      parameter.beat = Number(stringArr[2]);
    } else {
      targetObj.streamTarget = stringArr[1];
      targetObj.clientTarget = "all";
      parameter.beat = Number(stringArr[2]);
    }
  }
  if (targetObj.clientTarget === "all") {
    for (const client in bpmState) {
      result[client] = bpmState[client];
    }
  } else {
    result[targetObj.clientTarget] = bpmState[targetObj.clientTarget];
  }
  console.log("refultObj: ", result);

  for (const client in result) {
    if (targetObj.streamTarget === "all") {
      for (const stream of streamList) {
        result[client][stream].beat =
          (parameter.beat as number) | result[client][stream].beat;
        result[client][stream].flag =
          (parameter.flag as boolean) !== undefined
            ? (parameter.flag as boolean)
            : result[client][stream].flag;
      }
    } else {
      result[client][targetObj.streamTarget].beat =
        (parameter.beat as number) |
        result[client][targetObj.streamTarget].beat;
      result[client][targetObj.streamTarget].flag =
        (parameter.flag as boolean) !== undefined
          ? (parameter.flag as boolean)
          : result[client][targetObj.streamTarget].flag;
    }
  }

  return result;
};
