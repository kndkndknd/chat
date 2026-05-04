import { bpmStreamStateType } from "../../../../../types";
import { ioState } from "../../state/states/ioState";

export const emitQuantize = (
  quantizeObj: { [client: string]: bpmStreamStateType },
) => {
  console.log("emitQuantize", quantizeObj);
  for (const client in quantizeObj) {
    ioState?.io.to(client).emit("quantizeFromServer", quantizeObj[client]);
  }
};
