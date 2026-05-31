import { describe, expect, test } from "vitest";
import { exchangeRelativeSchedule } from "../../src/schedule/exchangeRelativeSchedule";

describe("exchangeRelativeSchedule", () => {
  test("先頭ログを起点とした相対時刻 (ms) を返す", () => {
    const log = [
      { date: "2025-02-01 19:30:00", cmd: "SCENARIO" },
      { date: "2025-02-01 19:30:10", cmd: "440" },
      { date: "2025-02-01 19:32:00", cmd: "STOP" },
    ];
    expect(exchangeRelativeSchedule(log)).toEqual([
      { schedule: 0, cmd: "SCENARIO" },
      { schedule: 10000, cmd: "440" },
      { schedule: 120000, cmd: "STOP" },
    ]);
  });

  test("ミリ秒付き日時の差分も保持する", () => {
    const log = [
      { date: "2025-02-01 19:30:00", cmd: "A" },
      { date: "2025-02-01 19:30:11.123", cmd: "B" },
    ];
    expect(exchangeRelativeSchedule(log)).toEqual([
      { schedule: 0, cmd: "A" },
      { schedule: 11123, cmd: "B" },
    ]);
  });

  test("ログが 1 件だけなら schedule:0 のみ", () => {
    const log = [{ date: "2025-02-01 19:30:00", cmd: "ONLY" }];
    expect(exchangeRelativeSchedule(log)).toEqual([
      { schedule: 0, cmd: "ONLY" },
    ]);
  });
});
