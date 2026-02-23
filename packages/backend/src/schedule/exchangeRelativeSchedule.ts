import { LogType } from "../../../types/log_schedule";

export const exchangeRelativeSchedule = (
  log: LogType[]
): { schedule: number; cmd: string }[] => {
  // const now = new Date();
  const startTime = new Date(log[0].date);
  return log.map((element) => {
    const date = new Date(element.date);
    // console.log("date", date.getTime());
    return { schedule: date.getTime() - startTime.getTime(), cmd: element.cmd };
  });
};
