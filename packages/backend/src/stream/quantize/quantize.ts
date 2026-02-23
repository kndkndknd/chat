import { unescape } from "querystring";
import { bpmClientStateType, bpmStreamStateType } from "../../../../../types";
import { bpmState, clientState } from "../../state";
import { decideFlagFromAverage } from "./decideFlagFromAverage";

export const quantize = (params: {
  splited: boolean;
  splitCmd?: string[];
}): { [client: string]: bpmStreamStateType } => {
  const bpmStreamState: { [client: string]: bpmStreamStateType } = {};
  for (const client in bpmState) {
    bpmStreamState[client] = {
      ...bpmState[client].stream,
    };
  }

  if (params.splited === undefined || !params.splited) {
    const flag = decideFlagFromAverage(bpmStreamState, "all", "all");
    console.log("decided flag: ", flag);
    for (const client in bpmStreamState) {
      for (const stream in bpmStreamState[client]) {
        bpmStreamState[client][stream].quantizeFlag = flag;
      }
    }
    console.log("quantize: ", bpmStreamState);
    return bpmStreamState;
  } else {
    return bpmStreamState; // setParamsSplitQuantize(splitCmd, bpmStreamState);
  }
};
