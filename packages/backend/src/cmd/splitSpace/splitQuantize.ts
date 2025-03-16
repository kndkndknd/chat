import { stringEmit } from "../../socket/ioEmit";
import { quantizeCmd } from "../../stream/quantize";

export const splitQuantize = (
  io,
  state,
  stringArr: string[],
  arrTypeArr: string[],
  target?: string
) => {
  console.log("splitQuantize: ", stringArr);
  console.log("target: ", target);
  if (stringArr.length === 1) {
    if (target !== undefined) {
      quantizeCmd(io, state, "all", target, 0);
    } else {
      quantizeCmd(io, state, "all", "all", 0);
    }
  } else if (stringArr.length === 2 && arrTypeArr[1] === "number") {
    // quantizeCmd(io, state, "all", target, Number(stringArr[1]));
    // quantizeCmd(io, state, "all", target, Number(stringArr[1]));
    if (target !== undefined) {
      quantizeCmd(io, state, "all", target, Number(stringArr[1]));
    } else {
      quantizeCmd(io, state, "all", "all", Number(stringArr[1]));
    }
  } else if (
    stringArr.length === 2 &&
    arrTypeArr[1] === "string" &&
    Object.keys(state.stream.quantize.flag.stream).includes(stringArr[1])
  ) {
    // quantizeCmd(io, state, stringArr[2], target, 0);
    if (target !== undefined) {
      quantizeCmd(io, state, stringArr[1], target, 0);
    } else {
      quantizeCmd(io, state, stringArr[1], "all", 0);
    }
  } else if (
    stringArr.length === 3 &&
    arrTypeArr[1] === "number" &&
    Object.keys(state.stream.quantize.flag.stream).includes(stringArr[2])
  ) {
    // quantizeCmd(io, state, stringArr[3], target, Number(stringArr[2]));
    if (target !== undefined) {
      quantizeCmd(io, state, stringArr[3], target, Number(stringArr[1]));
    } else {
      quantizeCmd(io, state, stringArr[3], "all", Number(stringArr[1]));
    }
  } else if (
    stringArr.length === 3 &&
    arrTypeArr[2] === "number" &&
    Object.keys(state.stream.quantize.flag.stream).includes(stringArr[1])
  ) {
    // quantizeCmd(io, state, stringArr[1], target, Number(stringArr[2]));
    if (target !== undefined) {
      quantizeCmd(io, state, stringArr[1], target, Number(stringArr[2]));
    } else {
      quantizeCmd(io, state, stringArr[1], "all", Number(stringArr[2]));
    }
  } else {
    stringEmit(io, "quantize failed", true, target);
  }
};
