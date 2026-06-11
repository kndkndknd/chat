import { LogType } from "../../../../types";
import { exchangeRelativeSchedule } from "./exchangeRelativeSchedule";
import { getTime } from "../util/getTime";

export const getScheduleFromJson = async (log: LogType[]) => {
  console.log(log[0].date);
  const scheduleArr =
    log[0].date !== "0000-00-00 00:00:00"
      ? exchangeRelativeSchedule(log)
      : log.map((element) => {
          return { schedule: getTime(element.date), cmd: element.cmd };
        });
  return scheduleArr;
};
