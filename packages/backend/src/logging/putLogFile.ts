import * as path from "path";
import * as fs from "fs";

import { cmdLog } from "../data";
import { getDateTimeString } from "../../../util/getDateTimeString";

// cmd 'LOG FILE' to save log file
export const putLogFile = async () => {
  const { yyyy, mm, dd, hh, mi, ss } = getDateTimeString();
  const logPath = path.join(
    __dirname,
    "../../../../log",
    `${yyyy}${mm}${dd}${hh}${mi}${ss}.json`
  );
  try {
    await fs.appendFileSync(logPath, JSON.stringify(cmdLog));
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
};
