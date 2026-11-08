import { beforeEach, describe, expect, test, vi } from "vitest";

const { flagState, muteReqEmit } = vi.hoisted(() => ({
  flagState: { mute: false },
  muteReqEmit: vi.fn(),
}));

vi.mock("../../src/state", () => ({ flagState }));
vi.mock("../../src/socket/ioEmit", () => ({ muteReqEmit }));

import { parseMuteFlag, setMute } from "../../src/cmd/mute";

describe("parseMuteFlag", () => {
  test("MUTE は引数なし / ON / TRUE / 1 で true", () => {
    expect(parseMuteFlag("MUTE")).toBe(true);
    expect(parseMuteFlag("MUTE", "ON")).toBe(true);
    expect(parseMuteFlag("MUTE", "true")).toBe(true);
    expect(parseMuteFlag("MUTE", "1")).toBe(true);
  });

  test("MUTE は OFF / FALSE / 0 で false", () => {
    expect(parseMuteFlag("MUTE", "OFF")).toBe(false);
    expect(parseMuteFlag("MUTE", "false")).toBe(false);
    expect(parseMuteFlag("MUTE", "0")).toBe(false);
  });

  test("UNMUTE は引数なし / OFF / FALSE / 0 で false", () => {
    expect(parseMuteFlag("UNMUTE")).toBe(false);
    expect(parseMuteFlag("UNMUTE", "OFF")).toBe(false);
    expect(parseMuteFlag("UNMUTE", "0")).toBe(false);
  });

  test("不正な引数は undefined", () => {
    expect(parseMuteFlag("MUTE", "FOO")).toBeUndefined();
    expect(parseMuteFlag("UNMUTE", "ON")).toBeUndefined();
  });
});

describe("setMute", () => {
  beforeEach(() => {
    flagState.mute = false;
    muteReqEmit.mockClear();
  });

  test("状態を更新して全端末へ送る", () => {
    setMute(true);
    expect(flagState.mute).toBe(true);
    expect(muteReqEmit).toHaveBeenCalledWith(true);
  });

  test("解除も同様に送る", () => {
    setMute(false);
    expect(flagState.mute).toBe(false);
    expect(muteReqEmit).toHaveBeenCalledWith(false);
  });
});
