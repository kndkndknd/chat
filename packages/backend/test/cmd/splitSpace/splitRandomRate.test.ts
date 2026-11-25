import { describe, expect, test, vi, beforeEach } from "vitest";

vi.mock("../../../src/socket/ioEmit", () => ({
  stringEmit: vi.fn(),
}));

vi.mock("../../../src/state", () => ({
  sampleRateState: {
    randomrate: {
      CHAT: true,
      PLAYBACK: false,
      TIMELAPSE: false,
      EMPTY: false,
    },
    randomratemode: "random",
    randomraterange: {
      CHAT: { min: 4000, max: 132300 },
      PLAYBACK: { min: 4000, max: 132300 },
      TIMELAPSE: { min: 4000, max: 132300 },
      EMPTY: { min: 4000, max: 132300 },
    },
    randomratenote: {
      CHAT: false,
      PLAYBACK: false,
      TIMELAPSE: false,
    },
  },
}));

import { splitRandomRate } from "../../../src/cmd/splitSpace/splitRandomRate";
import { stringEmit } from "../../../src/socket/ioEmit";
import { sampleRateState } from "../../../src/state";

describe("splitRandomRate モード切替", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (sampleRateState as any).randomratemode = "random";
  });

  test("RANDOM RATE RANDOM で完全ランダムモードになる", () => {
    splitRandomRate(["RANDOM", "RATE", "RANDOM"]);
    expect((sampleRateState as any).randomratemode).toBe("uniform");
    expect(stringEmit).toHaveBeenCalledWith("SAMPLERATE RANDOM MODE: RANDOM");
  });

  test("RANDOM RATE LOG で対数一様モードに戻る", () => {
    (sampleRateState as any).randomratemode = "uniform";
    splitRandomRate(["RANDOM", "RATE", "LOG"]);
    expect((sampleRateState as any).randomratemode).toBe("random");
    expect(stringEmit).toHaveBeenCalledWith("SAMPLERATE RANDOM MODE: LOG");
  });
});
