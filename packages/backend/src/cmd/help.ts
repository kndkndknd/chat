import SocketIO from "socket.io";
import { helpList } from "../states.js";

export const helpPrint = (stringArr: string[], io: SocketIO.Server) => {
  const help = stringArr[1] + ": " + helpList[stringArr[1]];
  io.emit("stringsFromServer", {
    strings: help,
    timeout: false,
  });
};
