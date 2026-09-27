import { describe, expect, test, vi, beforeEach } from "vitest";

vi.mock("../../src/state", () => ({
  quantizeState: {
    bar: 500,
    interval: null as number | null,
    currentTime: 0,
    timeout: 100,
    intervalFlag: true,
    stream: {
      CHAT: { flag: true, beat: 4 },
      PLAYBACK: { flag: false, beat: 1 },
      TIMELAPSE: { flag: false, beat: 1 },
    },
  },
}));

import { quantizeStop } from "../../src/quantize/quantizeStop";
import { quantizeState } from "../../src/state";

describe("quantizeStop", () => {
  beforeEach(() => {
    quantizeState.bar = 500;
    quantizeState.interval = 42 as any;
    quantizeState.intervalFlag = true;
    quantizeState.stream.CHAT.flag = true;
    quantizeState.stream.PLAYBACK.flag = true;
    quantizeState.stream.TIMELAPSE.flag = false;
  });

  test("interval を停止し、intervalFlag と各 stream の flag を false にする", () => {
    const result = quantizeStop();
    expect(result.interval).toBeNull();
    expect(result.intervalFlag).toBe(false);
    expect(result.stream.CHAT.flag).toBe(false);
    expect(result.stream.PLAYBACK.flag).toBe(false);
    expect(result.stream.TIMELAPSE.flag).toBe(false);
  });

  test("interval が null でも壊れない", () => {
    quantizeState.interval = null;
    const result = quantizeStop();
    expect(result.interval).toBeNull();
    expect(result.intervalFlag).toBe(false);
  });

  test("clearInterval が呼び出される", () => {
    const spy = vi.spyOn(globalThis, "clearInterval");
    quantizeStop();
    expect(spy).toHaveBeenCalledWith(42);
    spy.mockRestore();
  });
});
