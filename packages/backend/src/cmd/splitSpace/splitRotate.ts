import { stringEmit } from "../../socket/ioEmit";
import { m5Switch, m5SetIpAddress, m5Test } from "../../rotate/m5Access";

export const splitRotate = async (type: "rotation" | "vibration" = "rotation", stringArr: string[]) => {
  console.log("splitRotate", type, stringArr);
  if (
    stringArr.length === 1 &&
    (stringArr[0] === "ON" || stringArr[0] === "OFF")
  ) {
    const result = await m5Switch(type, stringArr[0] === "ON" ? true : false);
    if (result) {
      stringEmit(`M5STACK SWITCH ${stringArr[0]}: SUCCESS`);
    } else {
      stringEmit(`M5STACK SWITCH ${stringArr[0]}: FAILED`);
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
    const result = await m5Test(type === "vibration" ? "vibration" : "rotation");
    if (result) {
      stringEmit(`M5STACK STATE: ${String(result)}`);
    } else {
      stringEmit(`M5STACK STATE: ${String(result)}`);
    }
  } else {
    stringEmit(`M5STACK COMMAND INVALID`);
  }
};
