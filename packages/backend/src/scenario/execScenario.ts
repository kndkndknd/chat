import { receiveEnter } from "../cmd/receiveEnter";
import { flagState } from "../state";

export const execScenario = async (
  scenario: {
    format: "relative" | "absolute";
    timetable: { [key: string]: string };
  },
) => {
  flagState.scenario = true;
  const now = new Date();
  console.log("now", now.getTime());
  if (scenario.format === "relative") {
    const timetableArr = Object.keys(scenario.timetable).map((key) => {
      const execTimeArr = key.split(":");
      const time =
        execTimeArr.length === 3
          ? Number(execTimeArr[0]) * 60 * 60 * 1000 +
            Number(execTimeArr[1]) * 60 * 1000 +
            Number(execTimeArr[2]) * 1000
          : Number(execTimeArr[0]) * 60 * 60 * 1000 +
            Number(execTimeArr[1]) * 60 * 1000;
      return { time: time, cmd: scenario.timetable[key] };
    });
    console.log("timetableArr", timetableArr);
    /*
    timetableArr.forEach((item) => {
      setTimeout(() => {
        console.log("scenario", item.time, item.cmd);
        receiveEnter(item.cmd, "all", io, states);
      }, item.time);
    });
    */
    for (let i = 0; i < timetableArr.length; i++) {
      setTimeout(() => {
        console.log("scenario", timetableArr[i].time, timetableArr[i].cmd);
        receiveEnter(timetableArr[i].cmd, "scenario");
      }, timetableArr[i].time);
    }
  } else if (scenario.format === "absolute") {
    const diff = now.getTime() - new Date(Object.keys(scenario.timetable)[0]).getTime();
    for (let key in scenario.timetable) {
      console.log(key);
      console.log(scenario[key]);
      // keyの時刻の文字列をDate型に変換
      // const execTime = new Date(key);
      const execTimeArr = key.split(" ")[1].split(":");
      console.log("execTimeArr", execTimeArr);
      const timeTable = new Date();
      timeTable.setHours(Number(execTimeArr[0]));
      timeTable.setMinutes(Number(execTimeArr[1]));
      if (timeTable) {
        timeTable.setSeconds(Number(execTimeArr[2]));
      }

      console.log("timeTable", timeTable);
      console.log(timeTable.getTime());
      const execTime = timeTable.getTime() + diff - now.getTime();
      console.log('execTiming', execTime);
      console.log('exec: ', scenario.timetable[key]);

      if (execTime >= 0 && scenario.timetable[key] !== undefined && scenario.timetable[key] !== "REPLAY") {
        setTimeout(() => {
          receiveEnter(scenario.timetable[key], "all");
        }, execTime);
      }
    }
  }
  // 現在時刻を取得
};
