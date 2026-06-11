import { describe, expect, test, vi, beforeEach } from "vitest";

vi.mock("../../src/state", () => ({
  quantizeState: {
    flag: false,
    bar: 0,
    beat: 1,
    interval: null as number | null,
    currentTime: 0,
    timeout: 0,
    stream: [] as string[],
  },
}));

import { quantizeStop } from "../../src/quantize/quantizeStop";
import { quantizeState } from "../../src/state";

describe("quantizeStop", () => {
  beforeEach(() => {
    quantizeState.flag = true;
    quantizeState.bar = 500;
    quantizeState.beat = 4;
    quantizeState.interval = 42 as any;
    quantizeState.timeout = 100;
    quantizeState.stream = ["CHAT"];
  });

  test("quantizeState の bar/beat/interval をコピーし、flag=false, stream=[], timeout=0 を返す", () => {
    const result = quantizeStop();
    expect(result).toEqual({
      flag: false,
      bar: 500,
      beat: 4,
      stream: [],
      interval: 42,
      timeout: 0,
    });
  });

  test("interval が null でも壊れない", () => {
    quantizeState.interval = null;
    const result = quantizeStop();
    expect(result.interval).toBeNull();
    expect(result.flag).toBe(false);
    expect(result.stream).toEqual([]);
  });

  test("clearInterval が呼び出される", () => {
    const spy = vi.spyOn(globalThis, "clearInterval");
    quantizeStop();
    expect(spy).toHaveBeenCalledWith(42);
    spy.mockRestore();
  });
});
