import { describe, expect, test } from "vitest";
import {
  durationPattern,
  UPLOAD_CHUNK_SECONDS,
} from "../../../src/stream/uploadModule/durationPattern";

describe("durationPattern", () => {
  test("20秒未満は1区間で全長を返す", () => {
    expect(durationPattern(10, [])).toEqual([{ ss: "0", t: "10" }]);
  });

  test("60秒超も20秒ごとの連続区間で全長をカバーする", () => {
    const result = durationPattern(100, []);
    expect(result).toHaveLength(5);
    expect(result).toEqual([
      { ss: "0", t: "20" },
      { ss: "20", t: "20" },
      { ss: "40", t: "20" },
      { ss: "60", t: "20" },
      { ss: "80", t: "20" },
    ]);
  });

  test("端数は最後の区間の長さになる", () => {
    const result = durationPattern(65, []);
    expect(result).toEqual([
      { ss: "0", t: "20" },
      { ss: "20", t: "20" },
      { ss: "40", t: "20" },
      { ss: "60", t: "5" },
    ]);
  });

  test("stringArr[2] が HH:MM:SS の場合は開始時刻として扱う", () => {
    const result = durationPattern(3730, ["a", "b", "01:02:03"]);
    expect(result).toEqual([{ ss: "3723", t: "7" }]);
  });

  test("stringArr[2] が MM:SS の場合は開始時刻として扱う", () => {
    const result = durationPattern(200, ["a", "b", "02:30"]);
    expect(result[0]).toEqual({ ss: "150", t: "20" });
    expect(result.at(-1)).toEqual({ ss: "190", t: "10" });
  });

  test('stringArr[2] === "FULL" は全長を連続区間で返す', () => {
    const result = durationPattern(45, ["a", "b", "FULL"]);
    expect(result).toEqual([
      { ss: "0", t: "20" },
      { ss: "20", t: "20" },
      { ss: "40", t: "5" },
    ]);
  });

  test("開始時刻と長さの指定はその範囲だけを返す", () => {
    const result = durationPattern(50, ["a", "b", "00:30", "00:10"]);
    expect(result).toEqual([{ ss: "30", t: "10" }]);
  });

  test("開始時刻が動画長を超える場合は空配列", () => {
    expect(durationPattern(40, ["a", "b", "00:50"])).toEqual([]);
  });

  test("チャンク長は20秒", () => {
    expect(UPLOAD_CHUNK_SECONDS).toBe(20);
  });
});
