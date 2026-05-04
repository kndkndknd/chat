import { arduinoState } from "../../state";
import { connectTest } from "../../arduinoAccess/arduinoAccess";
import { ioState } from "../../state/states/ioState";

export const splitArduino = (stringArr: string[]) => {
  if (stringArr[1] === "TEST") {
    console.log("switch test");
    connectTest().then((result) => {
      console.log(result);
      arduinoState.connected = result;
      ioState?.io.emit("stringsFromServer", {
        strings: `${stringArr[0]}: ${String(arduinoState.connected)}`,
        timeout: true,
      });
    });
  } else if (stringArr[1] === "ADDRESS") {
    if (stringArr.length > 2) {
      arduinoState.host = stringArr[2];
    }
    ioState?.io.emit("stringsFromServer", {
      // strings: "SWITCH HOST: " + states.arduino.host,
      strings: `${stringArr[0]} HOST: ${String(arduinoState.host)}`,
      timeout: true,
    });
  } else if (stringArr[1] === "FALSE") {
    arduinoState.connected = false;
    ioState?.io.emit("stringsFromServer", {
      // strings: "SWITCH: " + String(states.arduino.connected),
      strings: `${stringArr[0]}: ${String(arduinoState.connected)}`,
      timeout: true,
    });
  }
};
