import { describe, expect, test } from "vitest";
import { getScheduleFromJson } from "../../src/schedule/getScheduleFromJson";

describe("getScheduleFromJson", () => {
  test("先頭が 0000-00-00 でない場合は exchangeRelativeSchedule の結果を返す", async () => {
    const log = [
      { date: "2025-02-01 19:30:00", cmd: "SCENARIO" },
      { date: "2025-02-01 19:30:10", cmd: "440" },
      { date: "2025-02-01 19:30:11.123", cmd: "CLICK" },
      { date: "2025-02-01 19:32:00", cmd: "STOP" },
    ];
    const result = await getScheduleFromJson(log);
    expect(result).toEqual([
      { schedule: 0, cmd: "SCENARIO" },
      { schedule: 10000, cmd: "440" },
      { schedule: 11123, cmd: "CLICK" },
      { schedule: 120000, cmd: "STOP" },
    ]);
  });

  test("先頭が 0000-00-00 00:00:00 の場合は getTime ベースの絶対値を返す", async () => {
    const log = [
      { date: "0000-00-00 00:00:00", cmd: "SCENARIO" },
      { date: "0000-00-00 00:00:10", cmd: "440" },
    ];
    const result = await getScheduleFromJson(log);
    // util/getTime: yyyy*365d + month*31d + dd*1d + hh*1h + mm*1m + ss*1s (ms)
    // "0000-00-00 00:00:00" → 0
    // "0000-00-00 00:00:10" → 10000
    expect(result).toEqual([
      { schedule: 0, cmd: "SCENARIO" },
      { schedule: 10000, cmd: "440" },
    ]);
  });

  test("ログ 1 件でも処理できる", async () => {
    const log = [{ date: "2025-02-01 19:30:00", cmd: "ONLY" }];
    const result = await getScheduleFromJson(log);
    expect(result).toEqual([{ schedule: 0, cmd: "ONLY" }]);
  });
});
