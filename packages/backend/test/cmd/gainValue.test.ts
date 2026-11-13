import { describe, expect, test } from "vitest";
import {
  GAIN_MAX,
  GAIN_MIN,
  clampGain,
  normalizeGainState,
} from "../../src/cmd/gainValue";
import type { gainStateType } from "../../../../types";

describe("clampGain", () => {
  test("範囲内の値はそのまま返す", () => {
    expect(clampGain(0.5)).toBe(0.5);
    expect(clampGain(GAIN_MIN)).toBe(0);
    expect(clampGain(GAIN_MAX)).toBe(2);
  });

  test("範囲外の値は 0〜2 にクランプする", () => {
    expect(clampGain(3)).toBe(2);
    expect(clampGain(-1)).toBe(0);
  });

  test("有限数でない値は 0 にする", () => {
    expect(clampGain(Number.NaN)).toBe(0);
    expect(clampGain(Number.POSITIVE_INFINITY)).toBe(0);
  });

  test("state 全体を 0〜2 に正規化する", () => {
    const gain = {
      MASTER: 3,
      SINEWAVE: 0.2,
      FEEDBACK: -1,
      WHITENOISE: 0.5,
      CLICK: 0.4,
      BASS: 1.5,
      CHAT: 1.5,
      GLITCH: 2,
      SIMULATE: 1,
      METRONOME: 0.9,
    } as gainStateType;

    normalizeGainState(gain);

    expect(gain.MASTER).toBe(2);
    expect(gain.FEEDBACK).toBe(0);
    expect(gain.SINEWAVE).toBe(0.2);
    expect(gain.GLITCH).toBe(2);
  });
});
