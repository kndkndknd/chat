import { cmdLog } from "../data";
import { getDateTimeString } from "../../../util/getDateTimeString";

export const cmdLogging = (strings: string) => {
  const { yyyy, mm, dd, hh, mi, ss, ms } = getDateTimeString();
  cmdLog.push({
    date: `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}.${ms}`,
    cmd: strings,
  });
  console.log("cmdLog", cmdLog);
};
