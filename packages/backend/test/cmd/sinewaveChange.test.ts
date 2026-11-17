import { beforeEach, describe, expect, test, vi } from "vitest";

const { cmdEmit } = vi.hoisted(() => ({ cmdEmit: vi.fn() }));

vi.mock("../../src/socket/ioEmit", () => ({ cmdEmit }));

import { sinewaveChange } from "../../src/cmd/sinewaveChange";
import { currentState } from "../../src/state/states/currentState";
import { previousState } from "../../src/state/states/previousState";
import { cmdState } from "../../src/state/states/cmdState";

describe("sinewaveChange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentState.sinewave = {};
    previousState.sinewave = {};
    cmdState.PORTAMENT = 0;
    cmdState.GAIN.SINEWAVE = 0.2;
  });

  test("TWICE は全対象の周波数を2倍にして前回値を保持する", () => {
    currentState.sinewave = { c1: 440, c2: 220 };

    sinewaveChange("TWICE");

    expect(currentState.sinewave).toEqual({ c1: 880, c2: 440 });
    expect(previousState.sinewave).toEqual({ c1: 440, c2: 220 });
    expect(cmdEmit).toHaveBeenCalledWith(["c1"], {
      cmd: "SINEWAVE",
      value: 880,
      flag: true,
      fade: 0,
      portament: 0,
      gain: 0.2,
    });
    expect(cmdEmit).toHaveBeenCalledWith(["c2"], {
      cmd: "SINEWAVE",
      value: 440,
      flag: true,
      fade: 0,
      portament: 0,
      gain: 0.2,
    });
  });

  test("HALF は全対象の周波数を1/2にして前回値を保持する", () => {
    currentState.sinewave = { c1: 440 };

    sinewaveChange("HALF");

    expect(currentState.sinewave).toEqual({ c1: 220 });
    expect(previousState.sinewave).toEqual({ c1: 440 });
    expect(cmdEmit).toHaveBeenCalledWith(
      ["c1"],
      expect.objectContaining({ value: 220, flag: true }),
    );
  });

  test("id 指定時はその対象だけを変更する", () => {
    currentState.sinewave = { c1: 440, c2: 220 };

    sinewaveChange("TWICE", { id: "c1" });

    expect(currentState.sinewave).toEqual({ c1: 880, c2: 220 });
    expect(previousState.sinewave).toEqual({ c1: 440 });
    expect(cmdEmit).toHaveBeenCalledTimes(1);
    expect(cmdEmit).toHaveBeenCalledWith(["c1"], expect.anything());
  });

  test("TWICE / HALF 以外では状態を変更しない", () => {
    currentState.sinewave = { c1: 440 };

    sinewaveChange("UNKNOWN");

    expect(currentState.sinewave).toEqual({ c1: 440 });
    expect(cmdEmit).not.toHaveBeenCalled();
  });
});
