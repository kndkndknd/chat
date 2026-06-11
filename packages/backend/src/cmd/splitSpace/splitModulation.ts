import { modulationByBPM } from "./modulationByBPM";
import { bpmState, bpmStateDefault, clientState } from "../../state";
import { sinewaveEmit } from "../sinewaveEmit";

export const splitModulation = (
  stringArr: string[],
  arrTypeArr: string[],
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
          bpmState[clientState.cmdClient[0]]?.MODULATION?.bpm ??
            bpmStateDefault.bpm,
          clientState.cmdClient
        );
  freqArr.forEach((freq, index) => {
    sinewaveEmit(freq, clientState.cmdClient[index]);
  });
};
