import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../../src/state", () => ({
  clientState: {
    cmdClient: ["c1"],
    paCmdClient: ["p1", "p2"],
    client: { p1: {}, p2: {} } as Record<string, any>,
  },
  currentState: {
    cmd: { BASS: [], WHITENOISE: [], FEEDBACK: [] },
    sinewave: {},
  },
}));
vi.mock("../../../src/data", () => ({
  cmdList: { CLICK: "CLICK", BASS: "BASS" },
}));

import { pickupPaCmdTarget } from "../../../src/cmd/pickupCmdTarget";

describe("pickupPaCmdTarget", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("CLICK は paCmdClient からランダム 1 件", () => {
    // ただし内部で clientState.cmdClient.length=1 を使うため、index=0 → "p1"
    expect(pickupPaCmdTarget("CLICK")).toEqual(["p1"]);
  });

  test("option.target を渡せばそのまま返す", () => {
    expect(pickupPaCmdTarget("BASS", { target: "X" })).toEqual(["X"]);
  });
});
