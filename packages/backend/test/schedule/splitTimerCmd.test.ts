import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { execSchedule, stringEmit } = vi.hoisted(() => ({
  execSchedule: vi.fn(),
  stringEmit: vi.fn(),
}));

vi.mock("../../src/schedule/execSchedule", () => ({ execSchedule }));
vi.mock("../../src/socket/ioEmit", () => ({ stringEmit }));

import { splitTimerCmd } from "../../src/schedule/splitTimerCmd";

describe("splitTimerCmd", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("3時間以内の絶対時刻は絶対時刻として予約する", () => {
    vi.spyOn(Date, "parse").mockReturnValue(30 * 60 * 1000);

    splitTimerCmd(["10:30:00", "BPM", "120"], ["10", "30", "00"]);

    expect(stringEmit).toHaveBeenCalledWith(
      "BPM 120 SCHEDULED 1800000ms LATER",
      true,
    );
    expect(execSchedule).not.toHaveBeenCalled();

    vi.advanceTimersByTime(30 * 60 * 1000);
    expect(execSchedule).toHaveBeenCalledWith("BPM 120");
  });

  test("過去時刻は HH:MM:SS を相対時間として予約する", () => {
    vi.spyOn(Date, "parse").mockReturnValue(0);

    splitTimerCmd(["00:00:30", "BPM"], ["00", "00", "30"]);

    vi.advanceTimersByTime(30 * 1000);
    expect(execSchedule).toHaveBeenCalledWith("BPM");
  });

  test("MM:SS 形式も相対時間として予約する", () => {
    vi.spyOn(Date, "parse").mockReturnValue(0);

    splitTimerCmd(["01:30", "CLICK"], ["01", "30"]);

    vi.advanceTimersByTime(90 * 1000);
    expect(execSchedule).toHaveBeenCalledWith("CLICK");
  });

  test("複数トークンのコマンドを空白結合して予約する", () => {
    vi.spyOn(Date, "parse").mockReturnValue(10 * 60 * 1000);

    splitTimerCmd(["10:10:00", "BPM", "120", "FAST"], ["10", "10", "00"]);

    vi.advanceTimersByTime(10 * 60 * 1000);
    expect(execSchedule).toHaveBeenCalledWith("BPM 120 FAST");
  });
});
