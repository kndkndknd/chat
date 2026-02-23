import { expect, test } from "vitest";
import { getScheduleFromJson } from "../../src/schedule/getScheduleFromJson";

test("getScheduleFromJson", async () => {
  const log = [
    { date: "2025-02-01 19:30:00", cmd: "SCENARIO" },
    { date: "2025-02-01 19:30:10", cmd: "440" },
    { date: "2025-02-01 19:30:11.123", cmd: "CLICK" },
    { date: "2025-02-01 19:32:00", cmd: "STOP" },
  ];

  // const log = [
  //   { date: "0000-00-00 00:00:00", cmd: "SCENARIO" },
  //   { date: "0000-00-00 00:00:10", cmd: "440" },
  //   { date: "0000-00-00 00:00:11.123", cmd: "CLICK" },
  //   { date: "0000-00-00 00:02:00", cmd: "STOP" },
  // ];
  const result = await getScheduleFromJson(log);
  console.log(result);
  expect(result).toEqual([
    { schedule: 0, cmd: "SCENARIO" },
    { schedule: 10000, cmd: "440" },
    { schedule: 11123, cmd: "CLICK" },
    { schedule: 120000, cmd: "STOP" },
  ]);
});
