import { describe, expect, test, vi, beforeEach } from "vitest";

vi.mock("../../src/state", () => ({
  bpmState: {} as Record<string, any>,
}));

vi.mock("../../src/data", () => ({
  streamList: ["PLAYBACK", "TIMELAPSE", "EMPTY"],
}));

vi.mock("../../src/socket/ioEmit", () => ({
  emitChangeBPM: vi.fn(),
}));

import { execChangeBPM } from "../../src/bpm/changeBpm";
import { emitChangeBPM } from "../../src/socket/ioEmit";
import { bpmState } from "../../src/state";

const setupBpmState = () => {
  for (const k of Object.keys(bpmState)) delete (bpmState as any)[k];
  for (const c of ["c1", "c2"]) {
    (bpmState as any)[c] = {
      bpm: 60,
      stream: {
        PLAYBACK: { beat: 4, gridFlag: false, quantizeFlag: false },
        TIMELAPSE: { beat: 4, gridFlag: false, quantizeFlag: false },
        EMPTY: { beat: 4, gridFlag: false, quantizeFlag: false },
      },
    };
  }
};

describe("execChangeBPM", () => {
  beforeEach(() => {
    setupBpmState();
    vi.clearAllMocks();
  });

  test("target 指定時は対象クライアントのみ bpm を変更し、対象へ送信する", () => {
    execChangeBPM(120, { target: "c1" });
    expect(bpmState.c1.bpm).toBe(120);
    expect(bpmState.c2.bpm).toBe(60);
    expect(emitChangeBPM).toHaveBeenCalledTimes(1);
    expect(emitChangeBPM).toHaveBeenCalledWith(120, ["c1"], [
      "PLAYBACK",
      "TIMELAPSE",
      "EMPTY",
      "METRONOME",
      "MODULATION",
    ]);
  });

  test("target 未指定時は全クライアントの bpm を変更し、全クライアントへ送信する", () => {
    execChangeBPM(120);
    expect(bpmState.c1.bpm).toBe(120);
    expect(bpmState.c2.bpm).toBe(120);
    expect(emitChangeBPM).toHaveBeenCalledWith(120, ["c1", "c2"], [
      "PLAYBACK",
      "TIMELAPSE",
      "EMPTY",
      "METRONOME",
      "MODULATION",
    ]);
  });
});
