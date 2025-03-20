import { quantizeCmd } from "../../stream/quantize";
import { quantizeObjType } from "../../../../types/quantizeType";
import { streamState } from "../../states";

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
): quantizeObjType | "quantize failed" => {
  console.log("splitQuantize: ", stringArr);
  console.log("arrTypeArr: ", arrTypeArr);
  console.log("target: ", target);
  if (stringArr.length === 1) {
    if (target !== undefined) {
      return quantizeCmd("all", target, 0);
    } else {
      return quantizeCmd("all", "all", 0);
    }
  } else if (stringArr.length === 2 && arrTypeArr[1] === "number") {
    // quantizeCmd(io, state, "all", target, Number(stringArr[1]));
    // quantizeCmd(io, state, "all", target, Number(stringArr[1]));
    if (target !== undefined) {
      return quantizeCmd("all", target, Number(stringArr[1]));
    } else {
      return quantizeCmd("all", "all", Number(stringArr[1]));
    }
  } else if (
    stringArr.length === 2 &&
    arrTypeArr[1] === "string" &&
    Object.keys(streamState.target).includes(stringArr[1])
  ) {
    // quantizeCmd(io, state, stringArr[2], target, 0);
    if (target !== undefined) {
      return quantizeCmd(stringArr[1], target, 0);
    } else {
      return quantizeCmd(stringArr[1], "all", 0);
    }
  } else if (
    stringArr.length === 3 &&
    arrTypeArr[1] === "number" &&
    Object.keys(streamState.target).includes(stringArr[2])
  ) {
    // quantizeCmd(io, state, stringArr[3], target, Number(stringArr[2]));
    if (target !== undefined) {
      return quantizeCmd(stringArr[3], target, Number(stringArr[1]));
    } else {
      return quantizeCmd(stringArr[3], "all", Number(stringArr[1]));
    }
  } else if (
    stringArr.length === 3 &&
    arrTypeArr[2] === "number" &&
    Object.keys(streamState.target).includes(stringArr[1])
  ) {
    // quantizeCmd(io, state, stringArr[1], target, Number(stringArr[2]));
    if (target !== undefined) {
      return quantizeCmd(stringArr[1], target, Number(stringArr[2]));
    } else {
      return quantizeCmd(stringArr[1], "all", Number(stringArr[2]));
    }
  } else {
    return "quantize failed";
  }
};
