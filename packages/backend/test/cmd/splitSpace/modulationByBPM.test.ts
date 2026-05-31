import { describe, expect, test } from "vitest";
import { modulationByBPM } from "../../../src/cmd/splitSpace/modulationByBPM";

describe("modulationByBPM", () => {
  test("先頭 client は baseFrequency を返す", () => {
    const result = modulationByBPM(440, 120, ["c1"]);
    expect(result).toEqual([440]);
  });

  test("BPM=120 の場合 modulationPeriodMs=500、index=1 で +2Hz、index=2 で +1Hz、index=3 で -2/3Hz", () => {
    // modulationPeriodMs = 60000/120 = 500
    // index=1: period=500,  modFreq=1000/500=2,  even→ false → 440-2 = 438
    // index=2: period=1000, modFreq=1000/1000=1, even→ true  → 440+1 = 441
    // index=3: period=1500, modFreq=1000/1500≈0.6667, even→false → 440 - 0.6667
    const result = modulationByBPM(440, 120, ["c1", "c2", "c3", "c4"]);
    expect(result[0]).toBe(440);
    expect(result[1]).toBe(438);
    expect(result[2]).toBe(441);
    expect(result[3]).toBeCloseTo(440 - 1000 / 1500, 10);
  });

  test("空の cmdClient は空配列を返す", () => {
    expect(modulationByBPM(440, 120, [])).toEqual([]);
  });

  test("BPM が 0 以下の場合 Error を投げる", () => {
    expect(() => modulationByBPM(440, 0, ["c1", "c2"])).toThrow(
      /BPM must be greater than zero/,
    );
    expect(() => modulationByBPM(440, -10, ["c1", "c2"])).toThrow();
  });
});
