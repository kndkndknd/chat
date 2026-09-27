import { voskCallEmit } from "../../socket/ioEmit";
import { flagState } from "../../state";

export const splitVoskCmd = (stringArr: string[], arrTypeArr: string[]) => {
  console.log("splitQuantize: ", stringArr);
  console.log("arrTypeArr: ", arrTypeArr);

  if (stringArr.length === 0) {
    // flagState.vosk = !flagState.vosk;
    voskCallEmit();

    // io.emit("voskCtrlFromServer", {
    //   type: "flag",
    //   flag: flagState.vosk,
    // });
  } else if (stringArr.length === 1 && arrTypeArr[0] === "number") {
    voskCallEmit();
  } else if (
    stringArr.length === 1 &&
    (stringArr[0] === "ON" ||
      stringArr[0] === "TRUE" ||
      stringArr[0] === "START")
  ) {
    flagState.vosk = true;
    voskCallEmit();
  } else if (
    stringArr.length === 1 &&
    (stringArr[0] === "OFF" ||
      stringArr[0] === "FALSE" ||
      stringArr[0] === "STOP")
  ) {
    flagState.vosk = false;
    voskCallEmit();
  }
};
