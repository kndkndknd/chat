import SocketIO from "socket.io";

export const stringEmit = (
  io: SocketIO.Server,
  strings: string,
  timeout?: boolean,
  target?: string
) => {
  console.log(strings);
  if (timeout === undefined) timeout = true;
  if (target === undefined) {
    io.emit("stringsFromServer", {
      strings: strings,
      timeout: timeout,
    });
  } else {
    io.to(target).emit("stringsFromServer", {
      strings: strings,
      timeout: timeout,
    });
  }
};
