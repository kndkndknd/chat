import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { fadeCmd, execChangeBPM, helpPrint, splitStop } = vi.hoisted(() => ({
  fadeCmd: vi.fn(),
  execChangeBPM: vi.fn(),
  helpPrint: vi.fn(),
  splitStop: vi.fn(),
}));

vi.mock("../../../src/cmd/splitSpace/fadeCmd", () => ({ fadeCmd }));
vi.mock("../../../src/bpm/changeBpm", () => ({ execChangeBPM }));
vi.mock("../../../src/cmd/help", () => ({ helpPrint }));
vi.mock("../../../src/cmd/splitSpace/splitStop", () => ({ splitStop }));

import { splitSpace } from "../../../src/cmd/splitSpace/index";
import { ioState } from "../../../src/state/states/ioState";

describe("splitSpace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ioState.io = {
      emit: vi.fn(),
      to: vi.fn(() => ({ emit: vi.fn() })),
    } as any;
  });

  afterEach(() => {
    ioState.io = null;
  });

  it("BPM は数値の場合に execChangeBPM へ渡す", async () => {
    await splitSpace(["BPM", "120"], "c1");

    expect(execChangeBPM).toHaveBeenCalledWith(120);
  });

  it("FADE は fadeCmd へ渡す", async () => {
    await splitSpace(["FADE", "IN"], "c1");

    expect(fadeCmd).toHaveBeenCalledWith(["FADE", "IN"], ["string", "string"]);
  });

  it("HELP は引数なしで helpPrint を呼ぶ", async () => {
    await splitSpace(["HELP"], "c1");

    expect(helpPrint).toHaveBeenCalledWith([]);
  });

  it("STOP は splitStop へ渡す", async () => {
    await splitSpace(["STOP"], "c1");

    expect(splitStop).toHaveBeenCalledWith(["STOP"]);
  });

  it("TIMELAPSE ON は timelapseFromServer TRUE を送る", async () => {
    await splitSpace(["TIMELAPSE", "ON"], "c1");

    expect(ioState.io?.emit).toHaveBeenCalledWith("timelapseFromServer", {
      cmd: "TRUE",
    });
  });
});
