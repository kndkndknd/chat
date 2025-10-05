import { setParamsSplitQuantize } from "../../stream/quantize/setParamsSplitQuantize";

export const splitQuantize = (stringArr, arrTypeArr, io) => {
  console.log("debug quantize");
  const quantizeObj = setParamsSplitQuantize(stringArr, arrTypeArr);
  console.log("splitQuantize return: ", quantizeObj);

  for (const client in quantizeObj) {
    io.to(client).emit("quantizeFromServer", quantizeObj[client].stream);
  }
  // io.emit("quantizeFromServer", quantizeObj);
};
