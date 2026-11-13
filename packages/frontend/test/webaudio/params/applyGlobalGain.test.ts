import { beforeEach, describe, expect, it, vi } from "vitest";
import { contextState, gainState } from "../../../src/state";
import {
  applyGlobalGain,
  applyGlobalGainValue,
  clampGainValue,
  isGlobalGainKey,
  normalizeGainValue,
} from "../../../src/webaudio/params/applyGlobalGain";
import type { gainStateType } from "../../../../../types";

const makeNode = (): GainNode =>
  ({ gain: { setTargetAtTime: vi.fn() } } as unknown as GainNode);

const GAIN_STATE: gainStateType = {
  MASTER: 1,
  SINEWAVE: 1,
  FEEDBACK: 1,
  WHITENOISE: 1,
  CLICK: 1,
  BASS: 1,
  CHAT: 1,
  GLITCH: 1,
  SIMULATE: 1,
  METRONOME: 1,
};

describe("applyGlobalGain", () => {
  let master: GainNode;
  let chat: GainNode;
  let glitch: GainNode;
  let other: GainNode;

  beforeEach(() => {
    master = makeNode();
    chat = makeNode();
    glitch = makeNode();
    other = makeNode();
    gainState.masterGain = master;
    gainState.chatGain = chat;
    gainState.glitchGain = glitch;
    gainState.oscGain = other;
    contextState.audioContext = { currentTime: 1.5 } as AudioContext;
  });

  it("MASTER / CHAT / GLITCH だけを即時適用する", () => {
    applyGlobalGain({
      ...GAIN_STATE,
      MASTER: 0.5,
      CHAT: 1.2,
      GLITCH: 0,
    });

    expect(master.gain.setTargetAtTime).toHaveBeenCalledWith(0.5, 1.5, 0.01);
    expect(chat.gain.setTargetAtTime).toHaveBeenCalledWith(1.2, 1.5, 0.01);
    expect(glitch.gain.setTargetAtTime).toHaveBeenCalledWith(0, 1.5, 0.01);
    expect(other.gain.setTargetAtTime).not.toHaveBeenCalled();
  });

  it("範囲外の値は 0〜2 にクランプする", () => {
    applyGlobalGain({
      ...GAIN_STATE,
      MASTER: 3,
      CHAT: -1,
    });

    expect(master.gain.setTargetAtTime).toHaveBeenCalledWith(2, 1.5, 0.01);
    expect(chat.gain.setTargetAtTime).toHaveBeenCalledWith(0, 1.5, 0.01);
  });

  it("非数値の値は適用しない", () => {
    applyGlobalGain({
      ...GAIN_STATE,
      MASTER: Number.NaN,
      CHAT: "0.5" as unknown as number,
      GLITCH: Number.POSITIVE_INFINITY,
    });

    expect(master.gain.setTargetAtTime).not.toHaveBeenCalled();
    expect(chat.gain.setTargetAtTime).not.toHaveBeenCalled();
    expect(glitch.gain.setTargetAtTime).not.toHaveBeenCalled();
  });

  it("個別キーだけを適用できる", () => {
    applyGlobalGainValue("CHAT", 0.75);

    expect(chat.gain.setTargetAtTime).toHaveBeenCalledWith(0.75, 1.5, 0.01);
    expect(master.gain.setTargetAtTime).not.toHaveBeenCalled();
    expect(glitch.gain.setTargetAtTime).not.toHaveBeenCalled();
  });

  it("個別キーの範囲外値もクランプする", () => {
    applyGlobalGainValue("CHAT", 3);

    expect(chat.gain.setTargetAtTime).toHaveBeenCalledWith(2, 1.5, 0.01);
  });

  it("数値の正規化とフォールバックを行う", () => {
    expect(clampGainValue(3)).toBe(2);
    expect(clampGainValue(-1)).toBe(0);
    expect(normalizeGainValue(1.5, 0.5)).toBe(1.5);
    expect(normalizeGainValue("bad", 0.5)).toBe(0.5);
    expect(normalizeGainValue(Number.NaN, 0.5)).toBe(0.5);
  });

  it("AudioContext が未初期化なら何もしない", () => {
    contextState.audioContext = null;

    applyGlobalGain({ ...GAIN_STATE, MASTER: 0 });

    expect(master.gain.setTargetAtTime).not.toHaveBeenCalled();
  });

  it("グローバル適用キーだけを識別する", () => {
    expect(isGlobalGainKey("MASTER")).toBe(true);
    expect(isGlobalGainKey("CHAT")).toBe(true);
    expect(isGlobalGainKey("GLITCH")).toBe(true);
    expect(isGlobalGainKey("SINEWAVE")).toBe(false);
    expect(isGlobalGainKey("SIMULATE")).toBe(false);
  });
});
