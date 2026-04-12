import { helpList } from "../states";
import { stringEmit } from "../socket/ioEmit";

export const helpPrint = (stringArr: string[]) => {
  const help = stringArr[1] + ": " + helpList[stringArr[1]];
  stringEmit(help, false);
};
