import { describe, expect, test, vi, beforeEach } from "vitest";

vi.mock("../../../src/state", () => ({
  bpmState: {} as Record<string, any>,
  clientState: { client: {} as Record<string, any> },
}));

import { quantize } from "../../../src/stream/quantize/quantize";
import { bpmState } from "../../../src/state";

const baseStream = (q: boolean) => ({
  bpm: 60,
  beat: 4,
  gridFlag: false,
  quantizeFlag: q,
  latency: 0,
});

const setup = (config: Record<string, Record<string, boolean>>) => {
  for (const k of Object.keys(bpmState)) delete (bpmState as any)[k];
  for (const c of Object.keys(config)) {
    (bpmState as any)[c] = { stream: {} as Record<string, any> };
    for (const s of Object.keys(config[c])) {
      (bpmState as any)[c].stream[s] = baseStream(config[c][s]);
    }
  }
};

describe("quantize", () => {
  beforeEach(() => {
    setup({
      c1: { S1: true, S2: false },
      c2: { S1: false, S2: false },
    });
  });

  test("splited=false で全 stream の quantizeFlag を多数決で決定（true 1件のみ → 全部 true に）", () => {
    // sumQuantizeFlag=1, denom=4, 1>2 false → quantizeFlag=true
    const result = quantize({ splited: false });
    for (const c of ["c1", "c2"]) {
      for (const s of ["S1", "S2"]) {
        expect(result[c][s].quantizeFlag).toBe(true);
      }
    }
  });

  test("splited=true は state.stream をそのまま返す（変更なし）", () => {
    const result = quantize({ splited: true });
    expect(result.c1.S1.quantizeFlag).toBe(true);
    expect(result.c1.S2.quantizeFlag).toBe(false);
    expect(result.c2.S1.quantizeFlag).toBe(false);
  });

  test("splited=false で過半数 true なら quantizeFlag=false に統一される", () => {
    setup({
      c1: { S1: true, S2: true },
      c2: { S1: true, S2: false },
    });
    // sumQuantizeFlag=3, denom=4, 3>2 true → quantizeFlag=false
    const result = quantize({ splited: false });
    for (const c of ["c1", "c2"]) {
      for (const s of ["S1", "S2"]) {
        expect(result[c][s].quantizeFlag).toBe(false);
      }
    }
  });
});
