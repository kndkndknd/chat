import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../src/socket/ioEmit", () => ({
  cmdEmit: vi.fn(),
}));
vi.mock("../../src/cmd/pickupCmdTarget", () => ({
  pickupCmdTarget: vi.fn(),
}));

import { execSynth } from "../../src/cmd/execSynth";
import { cmdEmit } from "../../src/socket/ioEmit";
import { pickupCmdTarget } from "../../src/cmd/pickupCmdTarget";

const mockedEmit = vi.mocked(cmdEmit);
const mockedPickup = vi.mocked(pickupCmdTarget);

describe("execSynth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPickup.mockReturnValue(["c1", "c2"]);
  });

  test("target 未指定なら全クライアントへ周波数付きで送る", () => {
    execSynth(440);

    expect(mockedEmit).toHaveBeenCalledWith(["c1", "c2"], {
      cmd: "SYNTH",
      value: 440,
    });
  });

  test("target 指定ならそのクライアントだけに送る", () => {
    execSynth(220, "c2");

    expect(mockedEmit).toHaveBeenCalledWith(["c2"], {
      cmd: "SYNTH",
      value: 220,
    });
  });

  test("周波数が未指定・不正なら value を付けない", () => {
    execSynth();
    execSynth(0);
    execSynth(Number.NaN);

    for (const call of mockedEmit.mock.calls) {
      expect(call[1]).toEqual({ cmd: "SYNTH" });
    }
  });
});
