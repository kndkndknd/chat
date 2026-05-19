import { getScheduleFile } from "./getScheduleFile";
import { getJsonFromFile } from "./getJsonFromFile";
// import { exchangeRelativeSchedule } from "./exchangeRelativeSchedule";
import { getScheduleFromJson } from "./getScheduleFromJson";
import { execSchedule } from "./execSchedule";
import { LogType } from "../../../../types";

export const getScheduleFromSplitSpace = async (
  stringArr: string[],
): Promise<boolean> => {
  const filePath = getScheduleFile();
  console.log("filePath", filePath);
  const schedulesObj = await getJsonFromFile(filePath);
  // console.log("schedulesObj", schedulesObj);
  try {
    if (schedulesObj !== false) {
      const schedules: { schedule: number; cmd: string }[] =
        await getScheduleFromJson(<LogType[]>schedulesObj);
      for (const schedule of schedules) {
        console.log("schedule", schedule);
        setTimeout(() => {
          execSchedule(schedule.cmd);
        }, schedule.schedule);
      }
    } else {
      return false;
    }
  } catch (e) {
    console.log(e);
    return false;
  }

  return true;
};
