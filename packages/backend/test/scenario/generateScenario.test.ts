import { describe, expect, test } from "vitest";
import {
  generateMergedScenario,
  formatRelativeTime,
  DEFAULT_EXCLUDE_CMDS,
} from "../../src/scenario/generateScenario";

describe("formatRelativeTime", () => {
  test("ミリ秒 0 は .mmm を省略する", () => {
    expect(formatRelativeTime(0)).toBe("0:00:00");
    expect(formatRelativeTime(3661000)).toBe("1:01:01");
  });

  test("ミリ秒は整数表記で付与する", () => {
    expect(formatRelativeTime(250)).toBe("0:00:00.250");
    expect(formatRelativeTime(3723004)).toBe("1:02:03.4");
  });

  test("負値は 0 に丸める", () => {
    expect(formatRelativeTime(-5)).toBe("0:00:00");
  });
});

describe("generateMergedScenario", () => {
  test("複数ログを重ねて区間ごとの代表コマンドと中央値時刻を返す", () => {
    const logA = [
      { date: "2025-02-01 19:30:00", cmd: "CLICK" },
      { date: "2025-02-01 19:30:00.500", cmd: "CLICK" },
      { date: "2025-02-01 19:30:02.500", cmd: "HALF" },
    ];
    const logB = [
      { date: "2025-02-01 20:00:00", cmd: "CLICK" },
      { date: "2025-02-01 20:00:00.900", cmd: "TWICE" },
      { date: "2025-02-01 20:00:02.600", cmd: "HALF" },
    ];

    const { scenario, stats } = generateMergedScenario([logA, logB], {
      binMs: 1000,
    });

    expect(scenario).toEqual({
      format: "relative",
      timetable: {
        "0:00:00": "CLICK",
        "0:00:02.550": "HALF",
      },
    });
    expect(stats).toEqual({
      logCount: 2,
      entryCount: 6,
      usedEntryCount: 6,
      excludedEntryCount: 0,
      stepCount: 2,
    });
  });

  test("より多くのログに出現したコマンドを代表に選ぶ", () => {
    const logA = [{ date: "2025-02-01 19:30:00", cmd: "TWICE" }];
    const logB = [{ date: "2025-02-01 20:00:00", cmd: "TWICE" }];
    const logC = [{ date: "2025-02-01 21:00:00", cmd: "HALF" }];

    const { scenario } = generateMergedScenario([logA, logB, logC], {
      binMs: 1000,
    });

    expect(scenario.timetable).toEqual({ "0:00:00": "TWICE" });
  });

  test("ログ数が同じなら総出現回数が多いコマンドを選ぶ", () => {
    const logA = [
      { date: "2025-02-01 19:30:00", cmd: "NOISE" },
      { date: "2025-02-01 19:30:00.100", cmd: "NOISE" },
      { date: "2025-02-01 19:30:00.200", cmd: "NOISE" },
    ];
    const logB = [{ date: "2025-02-01 20:00:00", cmd: "CLICK" }];

    const { scenario } = generateMergedScenario([logA, logB], { binMs: 1000 });

    expect(scenario.timetable).toEqual({ "0:00:00.100": "NOISE" });
  });

  test("ログ数・回数も同じなら辞書順で決定的に選ぶ", () => {
    const logA = [{ date: "2025-02-01 19:30:00", cmd: "BBB" }];
    const logB = [{ date: "2025-02-01 20:00:00", cmd: "AAA" }];

    const { scenario } = generateMergedScenario([logA, logB], { binMs: 1000 });

    expect(scenario.timetable).toEqual({ "0:00:00": "AAA" });
  });

  test("START / SCENARIO / LOG 系は除外する", () => {
    const log = [
      { date: "2025-02-01 19:30:00", cmd: "START" },
      { date: "2025-02-01 19:30:01", cmd: "SCENARIO extra" },
      { date: "2025-02-01 19:30:02", cmd: "LOG PUT" },
      { date: "2025-02-01 19:30:03", cmd: "CLICK" },
    ];

    const { scenario, stats } = generateMergedScenario([log], { binMs: 1000 });

    expect(scenario.timetable).toEqual({ "0:00:03": "CLICK" });
    expect(stats.usedEntryCount).toBe(1);
    expect(stats.excludedEntryCount).toBe(3);
    expect(DEFAULT_EXCLUDE_CMDS).toContain("START");
  });

  test("空ログは無視して空の timetable を返す", () => {
    const { scenario, stats } = generateMergedScenario([[], []], {
      binMs: 1000,
    });

    expect(scenario).toEqual({ format: "relative", timetable: {} });
    expect(stats.stepCount).toBe(0);
  });

  test("単一ログは先頭を 0 とした相対時刻になる", () => {
    const log = [
      { date: "2025-02-01 19:30:00", cmd: "CLICK" },
      { date: "2025-02-01 19:30:15", cmd: "STOP" },
    ];

    const { scenario } = generateMergedScenario([log]);

    expect(scenario.timetable).toEqual({
      "0:00:00": "CLICK",
      "0:00:15": "STOP",
    });
  });

  test("excludeCmds を指定すると既定の除外を差し替えられる", () => {
    const log = [
      { date: "2025-02-01 19:30:00", cmd: "START" },
      { date: "2025-02-01 19:30:01", cmd: "CLICK" },
    ];

    const { scenario } = generateMergedScenario([log], {
      binMs: 1000,
      excludeCmds: ["CLICK"],
    });

    expect(scenario.timetable).toEqual({ "0:00:00": "START" });
  });
});
