import { stringEmit } from "../../socket/ioEmit";
import { m5Switch, m5SetIpAddress, m5Test } from "../../rotate/m5Access";

export const splitRotate = async (type: "rotation" | "vibration", stringArr: string[]) => {
  if (
    stringArr.length === 1 &&
    (stringArr[0] === "ON" || stringArr[0] === "OFF")
  ) {
    const result = await m5Switch(type, stringArr[0] === "ON" ? true : false);
    if (result) {
      stringEmit(`M5STACK SWITCH ${stringArr[1]}: SUCCESS`);
    } else {
      stringEmit(`M5STACK SWITCH ${stringArr[1]}: FAILED`);
    }
  } else if (
    stringArr.length === 2 &&
    (stringArr[0] === "IP" || stringArr[0] === "SET")
  ) {
    const result = await m5SetIpAddress(stringArr[1], type);
    if (result) {
      stringEmit(`M5STACK SET IP ${stringArr[1]}: SUCCESS`);
    } else {
      stringEmit(`M5STACK SET IP ${stringArr[1]}: FAILED`);
    }
  } else if (stringArr.length === 1 && stringArr[0] === "TEST") {
    const result = await m5Test(type === "vibration" ? "viberation" : "rotation");
    if (result) {
      stringEmit(`M5STACK TEST: SUCCESS`);
    } else {
      stringEmit(`M5STACK TEST: FAILED`);
    }
  } else {
    stringEmit(`M5STACK COMMAND INVALID`);
  }
};
