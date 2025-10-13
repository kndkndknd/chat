import { bpmStreamStateType } from "../../../../../types";
import { bpmState } from "../../state";

export const setBpmState = (streamState: {
  [client: string]: bpmStreamStateType;
}) => {
  for (const client in streamState) {
    bpmState[client].stream = streamState[client];
  }
};
