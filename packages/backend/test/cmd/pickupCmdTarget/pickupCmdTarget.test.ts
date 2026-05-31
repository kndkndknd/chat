import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../../src/state", () => ({
  clientState: {
    cmdClient: ["c1", "c2"],
    paCmdClient: ["p1"],
    client: { c1: {}, c2: {} } as Record<string, any>,
  },
  currentState: {
    cmd: { BASS: [], WHITENOISE: [], FEEDBACK: [] },
    sinewave: {},
  },
}));
vi.mock("../../../src/data", () => ({
  cmdList: { BASS: "BASS", CLICK: "CLICK" },
}));

import { pickupCmdTarget } from "../../../src/cmd/pickupCmdTarget";

describe("pickupCmdTarget", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("CLICK はランダム 1 件（clientState.cmdClient ベース）", () => {
    expect(pickupCmdTarget("CLICK")).toEqual(["c1"]);
  });

  test("option.target を渡せばそれを返す", () => {
    expect(pickupCmdTarget("BASS", { target: "Z" })).toEqual(["Z"]);
  });
});
