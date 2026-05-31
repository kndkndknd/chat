import { ioState } from "../state/states/ioState";
import { helpList } from "../states";

export const helpPrint = (stringArr: string[]) => {
  const help = stringArr[1] + ": " + helpList[stringArr[1]];
  ioState?.io.emit("stringsFromServer", {
    strings: help,
    timeout: false,
  });
};
