import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../src/state/states/bpmState", () => ({
  bpmState: {} as Record<string, any>,
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

  test("stream が bpmState[target].stream に存在する場合はそのストリームの bpm で計算", () => {
    (bpmState as any).c1 = {
      stream: { CHAT: { bpm: 120 } },
      METRONOME: { bpm: 60 },
    };
    // Math.random()=0.5 → round(0.5*16)=8, msPerBeat=500, → 8*500/4 = 1000
    expect(gridTimeoutVal("CHAT", "c1")).toBe(1000);
  });

  test("stream が bpmState[target].stream に無いとき METRONOME.bpm で計算", () => {
    (bpmState as any).c2 = { stream: {}, METRONOME: { bpm: 60 } };
    // 8 * 1000 / 4 = 2000
    expect(gridTimeoutVal("MISSING", "c2")).toBe(2000);
  });
});
