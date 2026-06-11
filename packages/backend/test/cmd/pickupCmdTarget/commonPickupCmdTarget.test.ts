import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../../src/state", () => ({
  clientState: {
    cmdClient: ["c1", "c2", "c3"],
    paCmdClient: [],
    client: { c1: {}, c2: {}, c3: {} } as Record<string, any>,
  },
  currentState: {
    cmd: { BASS: [], WHITENOISE: [], FEEDBACK: [] } as Record<string, string[]>,
    sinewave: {} as Record<string, number>,
  },
}));
vi.mock("../../../src/data", () => ({
  cmdList: {
    BASS: "BASS",
    WHITENOISE: "WHITENOISE",
    FEEDBACK: "FEEDBACK",
    CLICK: "CLICK",
    SIMULATE: "SIMULATE",
  },
}));

import { commonPickupCmdTarget } from "../../../src/cmd/pickupCmdTarget";
import { currentState } from "../../../src/state";

describe("commonPickupCmdTarget", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    currentState.cmd.BASS = [];
    currentState.cmd.WHITENOISE = [];
    currentState.cmd.FEEDBACK = [];
    for (const k of Object.keys(currentState.sinewave))
      delete (currentState.sinewave as any)[k];
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("option.target を渡せばそれを優先して返す", () => {
    expect(
      commonPickupCmdTarget("BASS", ["c1", "c2"], { target: "X" }),
    ).toEqual(["X"]);
  });

  test("CLICK は clientArr の中からランダム 1 件", () => {
    expect(commonPickupCmdTarget("CLICK", ["c1", "c2", "c3"])).toEqual(["c1"]);
  });

  test("BASS で current.cmd.BASS が空ならランダム、非空ならそのまま返す", () => {
    expect(commonPickupCmdTarget("BASS", ["c1", "c2", "c3"])).toEqual(["c1"]);
    currentState.cmd.BASS = ["existing"];
    expect(commonPickupCmdTarget("BASS", ["c1", "c2", "c3"])).toEqual([
      "existing",
    ]);
  });

  test("SIMULATE は clientArr 全体を返す", () => {
    expect(commonPickupCmdTarget("SIMULATE", ["c1", "c2"])).toEqual([
      "c1",
      "c2",
    ]);
  });

  test("SINEWAVE で誰も発音していなければランダム 1 件", () => {
    expect(
      commonPickupCmdTarget("SINEWAVE", ["c1", "c2"], { value: 440 }),
    ).toEqual(["c1"]);
  });

  test("SINEWAVE で同じ周波数の端末があればそれを返し、currentState から削除", () => {
    (currentState.sinewave as any).c2 = 440;
    const result = commonPickupCmdTarget("SINEWAVE", ["c1", "c2"], {
      value: 440,
    });
    expect(result).toEqual(["c2"]);
    expect((currentState.sinewave as any).c2).toBeUndefined();
  });

  test("SINEWAVE で同周波数なし、未発音端末あれば未発音から", () => {
    (currentState.sinewave as any).c1 = 100;
    const result = commonPickupCmdTarget("SINEWAVE", ["c1", "c2", "c3"], {
      value: 440,
    });
    // unsoundArr=[c2,c3], Math.random=0 → c2
    expect(result).toEqual(["c2"]);
  });

  test("default ケースでは clientState.client から無作為", () => {
    // cmd が cmdList に含まれない場合の default
    expect(commonPickupCmdTarget("UNKNOWN_CMD", ["c1"])).toEqual(["c1"]);
  });
});
