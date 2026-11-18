import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  click: vi.fn(),
  textPrint: vi.fn(),
}));

vi.mock("../../../src/webaudio/sound/click", () => ({
  click: mocks.click,
}));
vi.mock("../../../src/canvasEvent", () => ({
  textPrint: mocks.textPrint,
}));

import { metronomeState } from "../../../src/state";
import { metronome } from "../../../src/webaudio/sound/metronome";
import { applyGlobalGainValue } from "../../../src/webaudio/params/applyGlobalGain";

describe("metronome のグローバル音量", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.click.mockClear();
    mocks.textPrint.mockClear();
    metronomeState.intervalId = null;
    applyGlobalGainValue("METRONOME", 0.3);
  });

  afterEach(() => {
    if (metronomeState.intervalId) {
      clearInterval(metronomeState.intervalId);
      metronomeState.intervalId = null;
    }
    vi.useRealTimers();
  });

  it("各tickで最新の METRONOME 音量を使う", () => {
    metronome(true, 100, 0.9);

    vi.advanceTimersByTime(100);
    expect(mocks.click).toHaveBeenLastCalledWith(0.3, 440);

    applyGlobalGainValue("METRONOME", 0.8);
    vi.advanceTimersByTime(100);
    expect(mocks.click).toHaveBeenLastCalledWith(0.8, 440);

    metronome(false, 100, 0.9);
    vi.advanceTimersByTime(200);
    expect(mocks.click).toHaveBeenCalledTimes(2);
  });
});
