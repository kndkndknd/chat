// import * as path from "path";
import * as fs from "fs";

// import { cmdLog } from "../data";
// import { getDateTimeString } from "../../../util/getDateTimeString";
import { LogType } from "../../../types/log_schedule";

// read log json file
export const getJsonFromFile = async (
  logPath: string
): Promise<LogType[] | boolean> => {
  try {
    const log = await fs.readFileSync(logPath, "utf-8");
    return JSON.parse(log);
  } catch (e) {
    console.log(e);
    return false;
  }
};
