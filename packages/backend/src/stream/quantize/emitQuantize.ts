import { bpmStreamStateType, paramsSocketType } from "../../../../../types";
import { targetEmit } from "../../webSocket";

export const emitQuantize = (quantizeObj: {
  [client: string]: bpmStreamStateType;
}) => {
  console.log("emitQuantize", quantizeObj);
  for (const client in quantizeObj) {
    const data: paramsSocketType = {
      type: "params",
      payload: {
        type: "quantize",
        param: quantizeObj[client],
      },
    };
    targetEmit(client, data);
  }
};
