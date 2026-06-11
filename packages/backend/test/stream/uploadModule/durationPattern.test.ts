import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { durationPattern } from "../../../src/stream/uploadModule/durationPattern";

describe("durationPattern", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("duration < 20 のとき t を duration 文字列に上書き", () => {
    const result = durationPattern(10, []);
    expect(result.length).toBe(1);
    expect(result[0].t).toBe("10");
  });

  test("duration > 60 のとき配列が長さ floor(duration/20)-1 になる", () => {
    // duration=100 → arrLength = 100/20 - 1 = 4
    const result = durationPattern(100, []);
    expect(result.length).toBe(4);
    // Math.random=0 → ss = i*20, t = 0
    expect(result[0]).toEqual({ ss: "0", t: "0" });
    expect(result[1]).toEqual({ ss: "20", t: "0" });
  });

  test("stringArr[2] が HH:MM:SS の場合は ss に直接設定", () => {
    const result = durationPattern(40, ["a", "b", "01:02:03"]);
    expect(result[0].ss).toBe("01:02:03");
  });

  test("stringArr[2] が MM:SS の場合は 00: を前置", () => {
    const result = durationPattern(40, ["a", "b", "02:30"]);
    expect(result[0].ss).toBe("00:02:30");
  });

  test('stringArr[2] === "FULL" のとき ss と t が更新される', () => {
    const result = durationPattern(45, ["a", "b", "FULL"]);
    expect(result[0].ss).toBe("0:00:00");
    expect(result[0].t).toBe("45");
  });

  test("stringArr.length===4 で時刻指定があれば t も更新", () => {
    const result = durationPattern(50, ["a", "b", "00:30", "00:10"]);
    expect(result[0].t).toBe("00:00:10");
    expect(result[0].ss).toBe("00:00:30");
  });
});
