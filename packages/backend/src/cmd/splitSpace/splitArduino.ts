import { arduinoState } from "../../state";
import { connectTest } from "../../arduinoAccess/arduinoAccess";
import { stringEmit } from "../../socket/ioEmit";

export const splitArduino = (stringArr: string[]) => {
  if (stringArr[1] === "TEST") {
    console.log("switch test");
    connectTest().then((result) => {
      console.log(result);
      arduinoState.connected = result;
      stringEmit(`${stringArr[0]}: ${String(arduinoState.connected)}`, true);
    });
  } else if (stringArr[1] === "ADDRESS") {
    if (stringArr.length > 2) {
      arduinoState.host = stringArr[2];
    }
    stringEmit(`${stringArr[0]} HOST: ${String(arduinoState.host)}`, true);
  } else if (stringArr[1] === "FALSE") {
    arduinoState.connected = false;
    stringEmit(`${stringArr[0]}: ${String(arduinoState.connected)}`, true);
  }
};
