import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../src/state/states/bpmState", () => ({
  bpmState: {} as Record<string, any>,
  bpmStateDefault: { bpm: 60 },
}));
vi.mock("../../../util/bpmCalc", () => ({
  millisecondsPerBeat: (bpm: number) => 60000 / bpm,
}));

import { gridTimeoutVal } from "../../src/stream/gridTimeoutVal";
import { bpmState } from "../../src/state/states/bpmState";

describe("gridTimeoutVal", () => {
  beforeEach(() => {
    for (const k of Object.keys(bpmState)) delete (bpmState as any)[k];
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("bpmState[target].bpm で計算する", () => {
    (bpmState as any).c1 = {
      bpm: 120,
      stream: { CHAT: { beat: 0 } },
      METRONOME: { beat: 4 },
    };
    // Math.random()=0.5 → round(0.5*16)=8, msPerBeat=500, → 8*500/4 = 1000
    expect(gridTimeoutVal("CHAT", "c1")).toBe(1000);
  });

  test("bpmState[target] が無いときは bpmStateDefault.bpm で計算", () => {
    // 8 * 1000 / 4 = 2000
    expect(gridTimeoutVal("MISSING", "cX")).toBe(2000);
  });
});
