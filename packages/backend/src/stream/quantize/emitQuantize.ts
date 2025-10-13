import { bpmStreamStateType } from "../../../../../types";

export const emitQuantize = (
  quantizeObj: { [client: string]: bpmStreamStateType },
  io
) => {
  console.log("emitQuantize", quantizeObj);
  for (const client in quantizeObj) {
    io.to(client).emit("quantizeFromServer", quantizeObj[client]);
  }
};
