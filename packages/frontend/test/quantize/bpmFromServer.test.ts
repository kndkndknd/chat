import { describe, expect, test, vi, beforeEach } from "vitest";

const { refreshMock, stateMock } = vi.hoisted(() => ({
  refreshMock: vi.fn(),
  stateMock: {
    quantizeState: { bar: 4000 },
    metronomeState: { bar: 4000 },
  },
}));

vi.mock("../../src/quantize/quantizeFromServer", () => ({
  refreshQuantizeInterval: refreshMock,
}));
vi.mock("../../src/state", () => stateMock);

import { bpmFromServer } from "../../src/quantize/bpmFromServer";

describe("bpmFromServer", () => {
  beforeEach(() => {
    refreshMock.mockClear();
    stateMock.quantizeState.bar = 4000;
    stateMock.metronomeState.bar = 4000;
  });

  test("ストリーム指定で quantizeState.bar を更新し reset=true で再アームする", () => {
    bpmFromServer({ bpm: 120, source: ["CHAT"] });

    // millisecondsPerBar(120) = 4 * 60000 / 120 = 2000
    expect(stateMock.quantizeState.bar).toBe(2000);
    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(refreshMock).toHaveBeenCalledWith(true);
  });

  test("METRONOME は metronomeState.bar のみ更新し再アームしない", () => {
    bpmFromServer({ bpm: 120, source: ["METRONOME"] });

    expect(stateMock.metronomeState.bar).toBe(2000);
    expect(stateMock.quantizeState.bar).toBe(4000);
    expect(refreshMock).not.toHaveBeenCalled();
  });

  test("MODULATION は何もしない", () => {
    bpmFromServer({ bpm: 120, source: ["MODULATION"] });

    expect(stateMock.quantizeState.bar).toBe(4000);
    expect(stateMock.metronomeState.bar).toBe(4000);
    expect(refreshMock).not.toHaveBeenCalled();
  });

  test("複数 source で MODULATION のみなら再アームしない", () => {
    bpmFromServer({ bpm: 60, source: ["MODULATION"] });
    expect(refreshMock).not.toHaveBeenCalled();
  });

  test("source に配列以外/undefined が来たら何もせず return する", () => {
    bpmFromServer({ bpm: 120 } as any);
    bpmFromServer({ bpm: 120, source: "CHAT" } as any);

    expect(stateMock.quantizeState.bar).toBe(4000);
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
