import { describe, expect, test, vi, beforeEach } from "vitest";

vi.mock("../../../src/state", () => ({
  clientState: {
    client: { c1: { index: 1 }, c2: { index: 2 } },
    cmdClient: ["c1"],
  },
  currentState: { cmd: { WHITENOISE: [] } },
  streamState: { target: {} },
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
vi.mock("../../../src/parameterChange", () => ({ parameterChange: vi.fn() }));
vi.mock("../../../src/cmd/notTargetEmit", () => ({ notTargetEmit: vi.fn() }));
vi.mock("../../../src/socket/ioEmit", () => ({ stringEmit: vi.fn() }));
vi.mock("../../../src/stream/chatPreparation", () => ({ chatPreparation: vi.fn() }));
vi.mock("../../../src/cmd/splitSpace/splitQuantize", () => ({ splitQuantize: vi.fn() }));
vi.mock("../../../src/cmd/splitSpace/numPaSwitch", () => ({ numPaSwitch: vi.fn() }));
vi.mock("../../../src/cmd/execStreamPreparation", () => ({
  execStreamPreparation: vi.fn(),
}));
vi.mock("../../../src/stream/quantize/splitBeat", () => ({ splitBeat: vi.fn() }));
vi.mock("../../../src/bpm/changeBpm", () => ({ execChangeBPM: vi.fn() }));

import { numTarget } from "../../../src/cmd/splitSpace/numTarget";
import { execChangeBPM } from "../../../src/bpm/changeBpm";
import { splitBeat } from "../../../src/stream/quantize/splitBeat";
import { stringEmit } from "../../../src/socket/ioEmit";
import { execCmd } from "../../../src/cmd/execCmd";
import { currentState } from "../../../src/state";

describe("numTarget cmd alias", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentState.cmd.WHITENOISE = [];
  });

  test("NOISE は WHITENOISE に解決して execCmd を呼ぶ", () => {
    numTarget(["c1"], ["NOISE"], ["string"]);
    expect(execCmd).toHaveBeenCalledWith("WHITENOISE", "c1", true);
  });

  test("WHITENOISE はそのまま execCmd を呼ぶ", () => {
    numTarget(["c1"], ["WHITENOISE"], ["string"]);
    expect(execCmd).toHaveBeenCalledWith("WHITENOISE", "c1", true);
  });

  test("SIMULATE は currentState.cmd に無くても対象端末のみに execCmd を呼ぶ", () => {
    expect(() => numTarget(["c1"], ["SIMULATE"], ["string"])).not.toThrow();
    expect(execCmd).toHaveBeenCalledWith("SIMULATE", "c1", true);
    expect(stringEmit).not.toHaveBeenCalled();
  });

  test("未定義コマンドでもエラーにならず not cmd を返す", () => {
    expect(() => numTarget(["c1"], ["UNKNOWN"], ["string"])).not.toThrow();
    expect(stringEmit).toHaveBeenCalledWith("not cmd", true, "c1");
    expect(execCmd).not.toHaveBeenCalled();
  });
});

describe("numTarget BPM", () => {
  beforeEach(() => vi.clearAllMocks());

  test("BPM <number> は対象クライアントの execChangeBPM を呼ぶ", () => {
    numTarget(["c1"], ["BPM", "60"], ["string", "number"]);
    expect(execChangeBPM).toHaveBeenCalledWith(60, { target: "c1" });
  });

  test("BPM <number> は対象クライアントにのみ textPrint を送る", () => {
    numTarget(["c1"], ["BPM", "60"], ["string", "number"]);
    expect(stringEmit).toHaveBeenCalledTimes(1);
    expect(stringEmit).toHaveBeenCalledWith("BPM:60", true, "c1");
  });

  test("複数 target それぞれに execChangeBPM を呼ぶ", () => {
    numTarget(["c1", "c2"], ["BPM", "120"], ["string", "number"]);
    expect(execChangeBPM).toHaveBeenCalledTimes(2);
    expect(execChangeBPM).toHaveBeenCalledWith(120, { target: "c1" });
    expect(execChangeBPM).toHaveBeenCalledWith(120, { target: "c2" });
    expect(stringEmit).toHaveBeenCalledWith("BPM:120", true, "c1");
    expect(stringEmit).toHaveBeenCalledWith("BPM:120", true, "c2");
  });

  test("target が undefined のときは execChangeBPM を呼ばない", () => {
    numTarget([undefined as unknown as string], ["BPM", "60"], [
      "string",
      "number",
    ]);
    expect(execChangeBPM).not.toHaveBeenCalled();
    expect(stringEmit).not.toHaveBeenCalled();
  });
});

describe("numTarget BEAT", () => {
  beforeEach(() => vi.clearAllMocks());

  test("BEAT <number> は対象クライアントの splitBeat を呼ぶ", () => {
    numTarget(["c1"], ["BEAT", "16"], ["string", "number"]);
    expect(splitBeat).toHaveBeenCalledWith(16, { target: "c1" });
  });

  test("BEAT <number> <stream> は対象と stream を渡して splitBeat を呼ぶ", () => {
    numTarget(["c1"], ["BEAT", "16", "PLAYBACK"], [
      "string",
      "number",
      "string",
    ]);
    expect(splitBeat).toHaveBeenCalledWith(16, {
      target: "c1",
      stream: "PLAYBACK",
    });
  });

  test("BEAT target が undefined のときは splitBeat を呼ばない", () => {
    numTarget([undefined as unknown as string], ["BEAT", "16"], [
      "string",
      "number",
    ]);
    expect(splitBeat).not.toHaveBeenCalled();
  });
});
