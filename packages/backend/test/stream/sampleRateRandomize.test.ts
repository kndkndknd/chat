import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../src/state", () => ({
  sampleRateState: {
    randomratemode: "random",
    randomraterange: {
      CHAT: { min: 1000, max: 2000 },
      PLAYBACK: { min: 5512.5, max: 22050 },
      EMPTY: { min: 50000, max: 5512.5 }, // for diatonic minMultiple > maxMultiple test
    },
  },
}));

import { sampleRateRandomize } from "../../src/stream/sampleRateRandomize";
import { sampleRateState } from "../../src/state";

describe("sampleRateRandomize", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("random モード時は min + random*(max-min) を返す", () => {
    (sampleRateState as any).randomratemode = "random";
    // Math.random()=0 → min が返る
    expect(sampleRateRandomize("CHAT")).toBe(1000);
  });

  test("diatonic モード時は baseFreq の倍数のうち range 内の値", () => {
    (sampleRateState as any).randomratemode = "diatonic";
    // PLAYBACK: min=5512.5 → minMultiple=1, max=22050 → maxMultiple=4
    // Math.random=0 → multiple = floor(0*4)+1 = 1 → 5512.5*1 = 5512.5
    expect(sampleRateRandomize("PLAYBACK")).toBe(5512.5);
  });

  test("diatonic モードで minMultiple > maxMultiple ならエラー", () => {
    (sampleRateState as any).randomratemode = "diatonic";
    expect(() => sampleRateRandomize("EMPTY")).toThrow(/minFreq > maxFreq/);
  });

  test("serial モードは frequencies 配列から無作為に返す（要素は数値）", () => {
    (sampleRateState as any).randomratemode = "serial";
    const result = sampleRateRandomize("PLAYBACK");
    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThan(0);
  });
});
