import { ioState } from "../state/states/ioState";
export const stringEmit = (
  strings: string,
  timeout?: boolean,
  target?: string
) => {
  console.log(strings);
  if (timeout === undefined) timeout = true;
  if (target === undefined) {
    console.log("target is undefined", strings);
    ioState?.io.emit("stringsFromServer", {
      strings: strings,
      timeout: timeout,
    });
  } else {
    ioState?.io.to(target).emit("stringsFromServer", {
      strings: strings,
      timeout: timeout,
    });
  }
};
