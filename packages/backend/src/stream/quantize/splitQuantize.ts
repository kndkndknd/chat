import { quantizeCmd } from "../../stream/quantize/quantizeCmd";
import { quantizeObjType } from "../../../../../types";
import { streamList } from "../../data";
import { bpmClientStateType } from "../../../../../types";

// ターゲットについてはtargetに入ってる。下記targetを除いたstringArr
// stringArr.length === 1 => quantizeCmd(io, state, "all", target, 0);
// stringArr.length === 2 && 1つめがnumber === "number" => quantizeCmd(io, state, "all", target, Number(stringArr[1]));
// stringArr.length === 2 && 1つめがstringでstream => quantizeCmd(io, state, stringArr[2], target, 0);
// stringArr.length === 3 && 1つめがnumberで2つ目がstream  => quantizeCmd(io, state, stringArr[3], target, Number(stringArr[1]));
// stringArr.length === 3 && 1つめがstreamで2つ目がnumber => quantizeCmd(io, state, stringArr[1], target, Number(stringArr[2]));
export const splitQuantize = (
  stringArr: string[],
  arrTypeArr: string[],
  target?: string
): { [client: string]: bpmClientStateType } | "quantize failed" => {
  console.log("splitQuantize: ", stringArr);
  console.log("arrTypeArr: ", arrTypeArr);
  console.log("target: ", target);

  if (stringArr.length === 1) {
    if (target !== undefined) {
      return quantizeCmd(
        { streamTarget: "all", clientTarget: target },
        { beat: 0 }
      );
    } else {
      return quantizeCmd(
        { streamTarget: "all", clientTarget: "all" },
        { beat: 0 }
      );
    }
  } else if (stringArr.length === 2 && arrTypeArr[1] === "number") {
    // quantizeCmd(io, state, "all", target, Number(stringArr[1]));
    // quantizeCmd(io, state, "all", target, Number(stringArr[1]));
    if (target !== undefined) {
      return quantizeCmd(
        { streamTarget: "all", clientTarget: target },
        { beat: Number(stringArr[1]) }
      );
    } else {
      return quantizeCmd(
        { streamTarget: "all", clientTarget: "all" },
        { beat: Number(stringArr[1]) }
      );
    }
  } else if (
    stringArr.length === 2 &&
    arrTypeArr[1] === "string" &&
    (streamList.includes(stringArr[1]) || stringArr[1] === "CHAT")
  ) {
    // quantizeCmd(io, state, stringArr[2], target, 0);
    if (target !== undefined) {
      return quantizeCmd(
        { streamTarget: stringArr[1], clientTarget: target },
        { beat: 0 }
      );
    } else {
      return quantizeCmd(
        { streamTarget: stringArr[1], clientTarget: "all" },
        { beat: 0 }
      );
    }
  } else if (stringArr.length === 2 && arrTypeArr[1] === "string") {
    if (stringArr[1] === "TRUE" || stringArr[1] === "ON") {
      return quantizeCmd(
        { streamTarget: "all", clientTarget: "all" },
        { flag: true }
      );
    } else if (stringArr[1] === "FALSE" || stringArr[1] === "OFF") {
      console.log("debug: ", stringArr);
      return quantizeCmd(
        { streamTarget: "all", clientTarget: "all" },
        { flag: false }
      );
    }
  } else if (
    stringArr.length === 3 &&
    arrTypeArr[1] === "number" &&
    (streamList.includes(stringArr[2]) || stringArr[2] === "CHAT")
  ) {
    // quantizeCmd(io, state, stringArr[3], target, Number(stringArr[2]));
    if (target !== undefined) {
      return quantizeCmd(
        { streamTarget: stringArr[2], clientTarget: target },
        { beat: Number(stringArr[1]) }
      );
    } else {
      return quantizeCmd(
        { streamTarget: stringArr[2], clientTarget: "all" },
        { beat: Number(stringArr[1]) }
      );
    }
  } else if (
    stringArr.length === 3 &&
    arrTypeArr[2] === "number" &&
    (streamList.includes(stringArr[1]) || stringArr[1] === "CHAT")
  ) {
    // quantizeCmd(io, state, stringArr[1], target, Number(stringArr[2]));
    if (target !== undefined) {
      return quantizeCmd(
        { streamTarget: stringArr[1], clientTarget: target },
        { beat: Number(stringArr[2]) }
      );
    } else {
      return quantizeCmd(
        { streamTarget: stringArr[1], clientTarget: "all" },
        { beat: Number(stringArr[2]) }
      );
    }
  } else {
    return "quantize failed";
  }
};
