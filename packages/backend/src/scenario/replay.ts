import { cmdLog } from "../data";
import { execScenario } from "./execScenario";


export const replay = async () => {
  const timetable: { [key: string]: any } = {};
  for(const log of cmdLog) {
    timetable[log.date] = log.cmd;
  }
  execScenario({format: "absolute", timetable});
};
