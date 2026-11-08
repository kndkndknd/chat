import { describe, expect, test, vi, beforeEach } from "vitest";

vi.mock("../../../src/state", () => ({
  clientState: { paCmdClient: ["p1"] },
  currentState: { cmd: { WHITENOISE: [] } },
  streamState: { pa: {} },
}));

vi.mock("../../../src/data", () => ({
  cmdList: {
    NOISE: "WHITENOISE",
    WHITENOISE: "WHITENOISE",
    SIMULATE: "SIMULATE",
  },
  streamList: ["PLAYBACK", "TIMELAPSE", "EMPTY"],
}));

vi.mock("../../../src/cmd/execCmd", () => ({ execCmd: vi.fn() }));
vi.mock("../../../src/stream/recordEmit", () => ({
  recordEmit: vi.fn(),
  recordAsOtherEmit: vi.fn(),
}));
vi.mock("../../../src/cmd/execSinewave", () => ({ execSinewave: vi.fn() }));
vi.mock("../../../src/stream/execStream", () => ({ execStream: vi.fn() }));
vi.mock("../../../src/parameterChange", () => ({ parameterChange: vi.fn() }));
vi.mock("../../../src/cmd/notTargetEmit", () => ({ notTargetEmit: vi.fn() }));
vi.mock("../../../src/socket/ioEmit", () => ({ stringEmit: vi.fn() }));
vi.mock("../../../src/stream/chatPreparation", () => ({
  chatPreparation: vi.fn(),
}));
vi.mock("../../../src/cmd/splitSpace/splitQuantize", () => ({
  splitQuantize: vi.fn(),
}));
vi.mock("../../../src/cmd/splitSpace/numPaSwitch", () => ({
  numPaSwitch: vi.fn(),
}));
vi.mock("../../../src/cmd/pickupCmdTarget", () => ({
  pickupPaCmdTarget: vi.fn(),
}));

import { splitPaTarget } from "../../../src/cmd/splitSpace/splitPaTarget";
import { execCmd } from "../../../src/cmd/execCmd";
import { stringEmit } from "../../../src/socket/ioEmit";
import { pickupPaCmdTarget } from "../../../src/cmd/pickupCmdTarget";
import { currentState } from "../../../src/state";

describe("splitPaTarget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentState.cmd.WHITENOISE = [];
    vi.mocked(pickupPaCmdTarget).mockReturnValue(["p1"]);
  });

  test("PA WHITENOISE は対象 PA クライアントに execCmd を呼ぶ", () => {
    splitPaTarget(["PA", "WHITENOISE"], ["string", "string"]);
    expect(execCmd).toHaveBeenCalledWith("WHITENOISE", "p1", true);
    expect(stringEmit).not.toHaveBeenCalled();
  });

  test("currentState.cmd に無いコマンド（SIMULATE）でも落ちず flag=true で送る", () => {
    expect(() =>
      splitPaTarget(["PA", "SIMULATE"], ["string", "string"]),
    ).not.toThrow();
    expect(execCmd).toHaveBeenCalledWith("SIMULATE", "p1", true);
    expect(stringEmit).not.toHaveBeenCalled();
  });

  test("発音中の対象なら flag=false を渡す", () => {
    currentState.cmd.WHITENOISE = ["p1"];
    splitPaTarget(["PA", "WHITENOISE"], ["string", "string"]);
    expect(execCmd).toHaveBeenCalledWith("WHITENOISE", "p1", false);
  });
});
