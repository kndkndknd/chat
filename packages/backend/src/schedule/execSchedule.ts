import SocketIO from "socket.io";
import { receiveEnter } from "../cmd/receiveEnter";
import { stopEmit } from "../cmd/stopEmit";
import { clientState, currentState } from "../states";

export const execSchedule = (io: SocketIO.Server, cmdString) => {
  const targetId = Object.keys(clientState.client)[
    Math.floor(Math.random() * Object.keys(clientState.client).length)
  ];
  const stringArr = cmdString.split(" ");
  if (
    Object.keys(currentState.cmd).includes(stringArr[stringArr.length - 1]) ||
    Object.keys(currentState.stream).includes(
      stringArr[stringArr.length - 1]
    ) ||
    /^([1-9]\d*|0)(\.\d+)?$/.test(stringArr[stringArr.length - 1])
  ) {
    receiveEnter(cmdString, targetId, io);
  } else if (stringArr[0] === "STOP") {
    if (stringArr.length === 1) {
      console.log("stoop", stringArr);
      // const client = "all";
      stopEmit(io, "", "ALL");
    }
  } else {
    io.emit("stringsFromServer", {
      strings: cmdString,
      timeout: false,
    });
  }
};
