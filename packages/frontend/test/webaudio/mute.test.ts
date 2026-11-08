import { beforeEach, describe, expect, test, vi } from "vitest";

const { setTargetAtTime, emitMuteChange, flagState, gainState, contextState } =
  vi.hoisted(() => {
    const setTargetAtTime = vi.fn();
    return {
      setTargetAtTime,
      emitMuteChange: vi.fn(),
      flagState: { mute: false },
      gainState: { muteGain: { gain: { setTargetAtTime } } as any },
      contextState: { audioContext: { currentTime: 1.5 } as any },
    };
  });

vi.mock("../../src/state", () => ({
  flagState,
  gainState,
  contextState,
}));
vi.mock("../../src/state/muteState", () => ({ emitMuteChange }));

import { mute } from "../../src/webaudio/mute";

describe("mute", () => {
  beforeEach(() => {
    flagState.mute = false;
    gainState.muteGain = { gain: { setTargetAtTime } } as any;
    contextState.audioContext = { currentTime: 1.5 } as any;
    setTargetAtTime.mockClear();
    emitMuteChange.mockClear();
  });

  test("flag=true で muteGain を 0 にフェードし、状態を通知する", () => {
    mute(true);

    expect(flagState.mute).toBe(true);
    expect(emitMuteChange).toHaveBeenCalledWith(true);
    expect(setTargetAtTime).toHaveBeenCalledWith(0, 1.5, 0.01);
  });

  test("flag=false で muteGain を 1 に戻す", () => {
    mute(false);

    expect(flagState.mute).toBe(false);
    expect(emitMuteChange).toHaveBeenCalledWith(false);
    expect(setTargetAtTime).toHaveBeenCalledWith(1, 1.5, 0.01);
  });

  test("初期化前（muteGain が null）でも状態は更新し、例外を出さない", () => {
    gainState.muteGain = null;

    expect(() => mute(true)).not.toThrow();
    expect(flagState.mute).toBe(true);
    expect(emitMuteChange).toHaveBeenCalledWith(true);
    expect(setTargetAtTime).not.toHaveBeenCalled();
  });
});
