import SocketIO from "socket.io";
import { previousState } from "../states";
import { cmdEmit } from "./cmdEmit";
import { streamEmit } from "../stream/streamEmit";
import { sinewaveEmit } from "./sinewaveEmit";
import { chatPreparation } from "../stream/chatPreparation";

export const previousCmd = (io: SocketIO.Server) => {
  console.log("previous sinewave", previousState.sinewave);
  console.log("previous cmd", previousState.cmd);
  console.log("previous stream", previousState.stream);
  for (let cmd in previousState.cmd) {
    previousState.cmd[cmd].forEach((target) => {
      cmdEmit(cmd, io, target);
    });
  }
  for (let stream in previousState.stream) {
    if (previousState.stream[stream]) {
      if (stream === "CHAT") {
        console.log("chat previous");
        chatPreparation(io);
      } else {
        streamEmit(stream, io);
      }
    }
  }
  for (let target in previousState.sinewave) {
    console.log(previousState.sinewave[target]);
    sinewaveEmit(previousState.sinewave[target], io, target);
  }
};
