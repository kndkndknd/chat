import { broadcastEmit, targetEmit } from "../webSocket";
import { stringSocketType } from "../../../../types";

export const stringEmit = (
  strings: string,
  timeout?: boolean,
  target?: string,
) => {
  console.log(strings);
  if (timeout === undefined) timeout = true;
  if (target === undefined) {
    console.log("target is undefined", strings);
    const stringSocket: stringSocketType = {
      type: "string",
      payload: { string: strings, timeout: timeout },
    };
    broadcastEmit(stringSocket);
  } else {
    const stringSocket: stringSocketType = {
      type: "string",
      payload: { string: strings, timeout: timeout },
    };
    targetEmit(target, stringSocket);
  }
};
