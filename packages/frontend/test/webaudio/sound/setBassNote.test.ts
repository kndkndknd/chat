import { describe, expect, test, vi, afterEach } from "vitest";

vi.mock("../../../src/state", () => ({
  oscState: { bassOsc: { frequency: { setValueAtTime: vi.fn() } } },
  gainState: { bassGain: { gain: { setValueAtTime: vi.fn() } } },
}));

import { setBassNote } from "../../../src/webaudio/sound/bass";

describe("setBassNote", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("random=0 → 確率テーブル先頭の A55 を返す", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(setBassNote()).toBe(55);
  });

  test("random=0.45 ちょうどでは 65.406 (C) を返す（< probability の判定）", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.45);
    expect(setBassNote()).toBe(65.406);
  });

  test("random=0.6 では 73.416 (D, prob=0.7) を返す", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.6);
    expect(setBassNote()).toBe(73.416);
  });

  test("random=0.8 では 82.407 (E, prob=0.85) を返す", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.8);
    expect(setBassNote()).toBe(82.407);
  });

  test("random=0.95 では 110 (A, prob=1) を返す", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.95);
    expect(setBassNote()).toBe(110);
  });

  test("戻り値は配列のいずれかの freq", () => {
    const allowed = [55, 65.406, 73.416, 82.407, 97.999, 110];
    for (let r = 0; r < 1; r += 0.05) {
      vi.spyOn(Math, "random").mockReturnValue(r);
      expect(allowed).toContain(setBassNote());
    }
  });
});
