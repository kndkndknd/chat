import * as path from "path";
import * as fs from "fs";
// import { log } from "console";

// schedule.jsonかscenario.jsonがあれば読み込む。なければログファイルで最も新しいものを読み込む
export const getScheduleFile = (): string => {
  // const schedulePath = path.join(__dirname, "../../../../log", `schedule.json`);
  // const scenarioPath = path.join(__dirname, "../../../../log", `scenario.json`);
  const files = fs.readdirSync(path.join(__dirname, "../../../../log"));
  const logFiles = files.filter((file) => file.match(/\.json$/));
  // schedule.jsonがあれば読み込む
  if (logFiles.includes("schedule.json")) {
    return path.join(__dirname, "../../../../log", "schedule.json");
  } else if (logFiles.includes("scenario.json")) {
    return path.join(__dirname, "../../../../log", "scenario.json");
  } else {
    // logファイルで最も新しいものを読み込む
    const logFilesDate = logFiles.map((file) => {
      return {
        file,
        date: new Date(file.slice(0, 14)),
      };
    });
    console.log(logFiles);
    const logFile = logFilesDate.sort((a, b) => {
      return b.date.getTime() - a.date.getTime();
    })[0].file;
    console.log(logFile);
    return path.join(__dirname, "../../../../log", logFile);
  }
};
