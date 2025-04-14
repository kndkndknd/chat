import { modulationByBPM } from "./modulationByBPM";
import { bpmState, clientState } from "../../state";
import { sinewaveEmit } from "../sinewaveEmit";

export const splitModulation = (
  stringArr: string[],
  arrTypeArr: string[],
  io
) => {
  const freqArr =
    stringArr.length === 3 && arrTypeArr[2] === "number"
      ? modulationByBPM(
          Number(stringArr[1]),
          Number(stringArr[2]),
          clientState.cmdClient
        )
      : modulationByBPM(
          Number(stringArr[1]),
          Object.values(bpmState.client).reduce((acc, val) => acc + val, 0) /
            Object.values(bpmState.client).length,
          clientState.cmdClient
        );
  freqArr.forEach((freq, index) => {
    sinewaveEmit(freq, io, clientState.cmdClient[index]);
  });
};
