import { beforeEach, describe, expect, test, vi } from "vitest";

const { pickupCmdTarget, cmdEmit, stringEmit } = vi.hoisted(() => ({
  pickupCmdTarget: vi.fn(() => ["c1"]),
  cmdEmit: vi.fn(),
  stringEmit: vi.fn(),
}));

vi.mock("../../../src/cmd/pickupCmdTarget", () => ({ pickupCmdTarget }));
vi.mock("../../../src/socket/ioEmit", () => ({ cmdEmit, stringEmit }));

import { fadeCmd } from "../../../src/cmd/splitSpace/fadeCmd";
import { currentState } from "../../../src/state/states/currentState";
import { cmdState } from "../../../src/state/states/cmdState";

describe("fadeCmd", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pickupCmdTarget.mockReturnValue(["c1"]);
    currentState.cmd.BASS = [];
    cmdState.FADE.IN = 0;
    cmdState.FADE.OUT = 0;
  });

  test("再生中の対象には flag=false / FADE.OUT を送る", () => {
    currentState.cmd.BASS = ["c1"];

    fadeCmd(["FADE", "BASS"], []);

    expect(cmdEmit).toHaveBeenCalledWith(["c1"], {
      cmd: "BASS",
      gain: 1.5,
      flag: false,
      fade: 5,
    });
  });

  test("停止中の対象には flag=true / FADE.IN を送る", () => {
    fadeCmd(["FADE", "BASS"], []);

    expect(cmdEmit).toHaveBeenCalledWith(["c1"], {
      cmd: "BASS",
      gain: 1.5,
      flag: true,
      fade: 5,
    });
  });

  test("fadeSec 指定時はその秒数を使う", () => {
    fadeCmd(["FADE", "BASS"], [], 3);

    expect(cmdEmit).toHaveBeenCalledWith(
      ["c1"],
      expect.objectContaining({ flag: true, fade: 3 }),
    );
  });

  test("FADE IN / OUT は 0 と 5 をトグルする", () => {
    fadeCmd(["FADE", "IN"], ["string", "string"]);
    expect(cmdState.FADE.IN).toBe(5);
    expect(stringEmit).toHaveBeenCalledWith("FADE IN: 5");

    fadeCmd(["FADE", "IN"], ["string", "string"]);
    expect(cmdState.FADE.IN).toBe(0);
    expect(stringEmit).toHaveBeenLastCalledWith("FADE IN: 0");
  });

  test("FADE IN/OUT の秒数指定は同じ値の再指定で 0 に戻る", () => {
    fadeCmd(["FADE", "IN", "3"], ["string", "string", "number"]);
    expect(cmdState.FADE.IN).toBe(3);

    fadeCmd(["FADE", "IN", "3"], ["string", "string", "number"]);
    expect(cmdState.FADE.IN).toBe(0);
  });

  test("FADE OFF は IN / OUT を両方 0 にする", () => {
    cmdState.FADE.IN = 5;
    cmdState.FADE.OUT = 2;

    fadeCmd(["FADE", "OFF"], []);

    expect(cmdState.FADE.IN).toBe(0);
    expect(cmdState.FADE.OUT).toBe(0);
    expect(stringEmit).toHaveBeenCalledWith("FADE IN/OUT: OFF");
  });

  test("FADE OFF OUT は OUT だけを 0 にする", () => {
    cmdState.FADE.IN = 5;
    cmdState.FADE.OUT = 2;

    fadeCmd(["FADE", "OFF", "OUT"], []);

    expect(cmdState.FADE.IN).toBe(5);
    expect(cmdState.FADE.OUT).toBe(0);
    expect(stringEmit).toHaveBeenCalledWith("FADE OUT: OFF");
  });

  test("対象外のコマンドでは何も送らない", () => {
    fadeCmd(["FADE", "UNKNOWN"], []);

    expect(cmdEmit).not.toHaveBeenCalled();
    expect(stringEmit).not.toHaveBeenCalled();
  });
});
