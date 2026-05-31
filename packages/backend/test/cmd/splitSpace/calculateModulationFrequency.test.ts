import { describe, expect, test } from "vitest";
import { calculateModulationFrequency } from "../../../src/cmd/splitSpace/modulationByBPM";

describe("calculateModulationFrequency", () => {
  test("plusminus=true で +modFreq", () => {
    // modFreq = 1000 / 500 = 2
    expect(calculateModulationFrequency(440, 500, true)).toBe(442);
  });

  test("plusminus=false で -modFreq", () => {
    expect(calculateModulationFrequency(440, 500, false)).toBe(438);
  });

  test("modulationPeriodMs が 0 以下なら Error", () => {
    expect(() => calculateModulationFrequency(440, 0, true)).toThrow(
      /Modulation period must be greater than zero/,
    );
    expect(() => calculateModulationFrequency(440, -1, true)).toThrow();
  });

  test("非整数の modulationPeriodMs で正しい結果", () => {
    expect(calculateModulationFrequency(0, 100, true)).toBeCloseTo(10, 10);
  });
});
