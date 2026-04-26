import { cmdLog } from "../data";
import { execScenario } from "./execScenario";

import SocketIO from "socket.io";

export const replay = async (io: SocketIO.Server) => {
  const timetable: { [key: string]: any } = {};
  for(const log of cmdLog) {
    timetable[log.date] = log.cmd;
  }
  execScenario({format: "absolute", timetable}, io);
};
