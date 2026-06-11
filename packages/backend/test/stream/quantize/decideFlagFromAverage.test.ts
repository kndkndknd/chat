import { describe, expect, test } from "vitest";
import { decideFlagFromAverage } from "../../../src/stream/quantize/decideFlagFromAverage";

const make = (quantizeFlag: boolean) => ({
  bpm: 120,
  beat: 4,
  gridFlag: false,
  quantizeFlag,
  latency: 0,
});

describe("decideFlagFromAverage", () => {
  test("過半数 true なら false を返す（quantize 解除側）", () => {
    const obj = {
      c1: { S1: make(true), S2: make(true) },
      c2: { S1: make(true), S2: make(false) },
    };
    // sum=3, denom=4, 3 > 2 → false
    expect(decideFlagFromAverage(obj, "all", "all")).toBe(false);
  });

  test("半数以下なら true を返す（quantize 適用側）", () => {
    const obj = {
      c1: { S1: make(true), S2: make(false) },
      c2: { S1: make(false), S2: make(false) },
    };
    // sum=1, denom=4, 1 > 2 false → true
    expect(decideFlagFromAverage(obj, "all", "all")).toBe(true);
  });

  test("clientTarget が指定されればそのクライアントのみ参照", () => {
    const obj = {
      c1: { S1: make(true), S2: make(true) },
      c2: { S1: make(false), S2: make(false) },
    };
    // c1 のみ → sum=2, denom=4 (denomは全体), 2 > 2 false → true
    expect(decideFlagFromAverage(obj, "c1", "all")).toBe(true);
  });

  test("streamTarget が指定されればそのストリームのみ参照", () => {
    const obj = {
      c1: { S1: make(true), S2: make(false) },
      c2: { S1: make(true), S2: make(false) },
    };
    // S1 のみ → sum=2, denom=4, 2 > 2 false → true
    expect(decideFlagFromAverage(obj, "all", "S1")).toBe(true);
  });
});
