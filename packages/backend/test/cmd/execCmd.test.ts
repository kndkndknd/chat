import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../src/state", () => ({
  clientState: {
    cmdClient: ["c1", "c2"],
    client: { c1: {}, c2: {} } as Record<string, any>,
  },
  cmdState: {
    GAIN: {
      BASS: 1.5,
      WHITENOISE: 0.5,
      FEEDBACK: 0.6,
      CLICK: 0.4,
      SIMULATE: 1.0,
    },
    FADE: { IN: 0, OUT: 0 },
    CLICKFREQ: 440,
  },
  currentState: {
    cmd: {
      FEEDBACK: [] as string[],
      WHITENOISE: [] as string[],
      CLICK: [] as string[],
      BASS: [] as string[],
      METRONOME: [] as string[],
    },
    sinewave: {} as Record<string, number>,
  },
  streamState: { target: {}, pa: {} },
  previousState: { cmd: {}, sinewave: {} },
  bpmState: {},
}));
vi.mock("../../src/data", () => ({
  cmdList: {
    BASS: "BASS",
    WHITENOISE: "WHITENOISE",
    FEEDBACK: "FEEDBACK",
    CLICK: "CLICK",
    SIMULATE: "SIMULATE",
    METRONOME: "METRONOME",
    PREVIOUS: "PREVIOUS",
    PREV: "PREVIOUS",
    UP: "UP",
    DOWN: "DOWN",
    SAME: "SAME",
  },
  streamList: [],
}));
vi.mock("../../src/cmd/pickupCmdTarget", () => ({
  pickupCmdTarget: vi.fn(),
}));
vi.mock("../../src/cmd/clickFreq", () => ({
  clickFreq: vi.fn(),
}));

import { getCmd } from "../../src/cmd/execCmd";
import { pickupCmdTarget } from "../../src/cmd/pickupCmdTarget";
import { clickFreq } from "../../src/cmd/clickFreq";
import { cmdState, currentState } from "../../src/state";

const mockedPickup = vi.mocked(pickupCmdTarget);
const mockedClickFreq = vi.mocked(clickFreq);

describe("getCmd", () => {
  beforeEach(() => {
    mockedPickup.mockReturnValue(["c1"]);
    mockedClickFreq.mockReturnValue(440);
    currentState.cmd.BASS = [];
    currentState.cmd.WHITENOISE = [];
    currentState.cmd.FEEDBACK = [];
    cmdState.CLICKFREQ = 440;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("STOP は全体停止を返す", () => {
    expect(getCmd("STOP")).toEqual({
      type: "STOP",
      source: "",
      target: "ALL",
      group: "all",
    });
  });

  test("WHITENOISE は CMD 型で cmdList と GAIN を反映する", () => {
    expect(getCmd("WHITENOISE")).toEqual({
      type: "CMD",
      cmd: { cmd: "WHITENOISE", gain: 0.5, flag: true, fade: 0 },
      target: ["c1"],
    });
  });

  test("FEEDBACK は CMD 型で cmdList と GAIN を反映する", () => {
    expect(getCmd("FEEDBACK")).toEqual({
      type: "CMD",
      cmd: { cmd: "FEEDBACK", gain: 0.6, flag: true, fade: 0 },
      target: ["c1"],
    });
  });

  test("BASS は CMD 型で cmdList と GAIN を反映する", () => {
    expect(getCmd("BASS")).toEqual({
      type: "CMD",
      cmd: { cmd: "BASS", gain: 1.5, flag: true, fade: 0 },
      target: ["c1"],
    });
  });

  test("BASS で対象が既に発音中なら flag=false / fade=OUT を返す", () => {
    currentState.cmd.BASS = ["c1"];
    mockedPickup.mockReturnValue(["c1"]);
    const result = getCmd("BASS");

    expect(result).toEqual({
      type: "CMD",
      cmd: { cmd: "BASS", gain: 1.5, flag: false, fade: 0 },
      target: ["c1"],
    });
    expect(currentState.cmd.BASS).not.toContain("c1");
  });

  test("BASS で対象が未発音なら currentState.cmd.BASS に追加する", () => {
    mockedPickup.mockReturnValue(["c1"]);
    getCmd("BASS");

    expect(currentState.cmd.BASS).toEqual(["c1"]);
  });

  test("flag 引数を渡すと発音中でも flag を上書きする", () => {
    currentState.cmd.BASS = ["c1"];
    mockedPickup.mockReturnValue(["c1"]);
    const result = getCmd("BASS", undefined, true);

    expect(result).toMatchObject({
      type: "CMD",
      cmd: { cmd: "BASS", flag: true, fade: 0 },
    });
  });

  test("CLICK は GAIN.CLICK を反映する", () => {
    expect(getCmd("CLICK")).toEqual({
      type: "CMD",
      cmd: { cmd: "CLICK", gain: 0.4 },
      target: ["c1"],
    });
  });

  test("UP/DOWN/SAME は clickFreq の結果を value に設定し CLICKFREQ を更新する", () => {
    mockedClickFreq.mockReturnValue(494);
    const result = getCmd("UP");

    expect(result).toEqual({
      type: "CMD",
      cmd: { cmd: "CLICK", gain: 0.4, value: 494 },
      target: ["c1"],
    });
    expect(cmdState.CLICKFREQ).toBe(494);
  });

  test("SAME は現在の CLICKFREQ をそのまま返す", () => {
    mockedClickFreq.mockReturnValue(440);
    const result = getCmd("SAME");

    expect(result).toMatchObject({ type: "CMD", cmd: { cmd: "CLICK", value: 440 } });
  });

  test("SIMULATE は GAIN.SIMULATE を反映する", () => {
    expect(getCmd("SIMULATE")).toEqual({
      type: "CMD",
      cmd: { cmd: "SIMULATE", gain: 1.0 },
      target: ["c1"],
    });
  });

  test("METRONOME は target を返す", () => {
    const result = getCmd("METRONOME");
    expect(result).toMatchObject({ type: "CMD", target: ["c1"] });
  });

  test("PREVIOUS / PREV は PREVIOUS 型を返す", () => {
    expect(getCmd("PREVIOUS")).toEqual({ type: "PREVIOUS" });
    expect(getCmd("PREV")).toEqual({ type: "PREVIOUS" });
  });

  test("target を渡すと pickupCmdTarget に { target } を渡す", () => {
    mockedPickup.mockReturnValue(["X"]);
    getCmd("BASS", "X");

    expect(mockedPickup).toHaveBeenCalledWith("BASS", { target: "X" });
    expect(getCmd("BASS", "X")).toMatchObject({ target: ["X"] });
  });

  test("target を渡さないと pickupCmdTarget は cmdStrings のみで呼ばれる", () => {
    getCmd("BASS");
    expect(mockedPickup).toHaveBeenCalledWith("BASS");
  });
});
