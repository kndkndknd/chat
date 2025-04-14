import { arduinoState } from "../../state";
import { connectTest } from "../../arduinoAccess/arduinoAccess";

export const splitArduino = (stringArr: string[], io) => {
  if (stringArr[1] === "TEST") {
    console.log("switch test");
    connectTest().then((result) => {
      console.log(result);
      arduinoState.connected = result;
      io.emit("stringsFromServer", {
        strings: `${stringArr[0]}: ${String(arduinoState.connected)}`,
        timeout: true,
      });
    });
  } else if (stringArr[1] === "ADDRESS") {
    if (stringArr.length > 2) {
      arduinoState.host = stringArr[2];
    }
    io.emit("stringsFromServer", {
      // strings: "SWITCH HOST: " + states.arduino.host,
      strings: `${stringArr[0]} HOST: ${String(arduinoState.host)}`,
      timeout: true,
    });
  } else if (stringArr[1] === "FALSE") {
    arduinoState.connected = false;
    io.emit("stringsFromServer", {
      // strings: "SWITCH: " + String(states.arduino.connected),
      strings: `${stringArr[0]}: ${String(arduinoState.connected)}`,
      timeout: true,
    });
  }
};
