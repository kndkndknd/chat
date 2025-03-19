import SocketIO from "socket.io";
import { cmdStateType } from "../../../types/global";
import { receiveEnter } from "../cmd/receiveEnter";
import { stopEmit } from "../cmd/stopEmit";
import { states } from "../states";

export const execSchedule = (io: SocketIO.Server, cmdString) => {
  const targetId = Object.keys(states.client)[
    Math.floor(Math.random() * Object.keys(states.client).length)
  ];
  const stringArr = cmdString.split(" ");
  if (
    Object.keys(states.current.cmd).includes(stringArr[stringArr.length - 1]) ||
    Object.keys(states.current.stream).includes(
      stringArr[stringArr.length - 1]
    ) ||
    /^([1-9]\d*|0)(\.\d+)?$/.test(stringArr[stringArr.length - 1])
  ) {
    receiveEnter(cmdString, targetId, io, states);
  } else if (stringArr[0] === "STOP") {
    if (stringArr.length === 1) {
      console.log("stoop", stringArr);
      // const client = "all";
      stopEmit(io, states, "", "ALL");
    }
  } else {
    io.emit("stringsFromServer", {
      strings: cmdString,
      timeout: false,
    });
  }
};
