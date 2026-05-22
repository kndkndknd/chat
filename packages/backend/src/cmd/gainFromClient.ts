import { Server } from "socket.io";
import { gainStateType } from "../../../../types";
import { cmdState } from "../state/states/cmdState";

export const gainFromClient = (data: gainStateType, io: Server) => {
  for (const key in data) {
    if (cmdState.GAIN[key] !== undefined) {
      cmdState.GAIN[key] = data[key];
    }
  }
  io.emit("gainFromServer", data);
};
