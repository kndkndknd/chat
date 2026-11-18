import { beforeEach, describe, expect, it, vi } from "vitest";
import { contextState, gainState } from "../../../src/state";
import {
  GAIN_DEFAULTS,
  applyGlobalGain,
  applyGlobalGainValue,
  clampGainValue,
  getGlobalGainValue,
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
  let sinewave: GainNode;
  let feedback: GainNode;
  let whitenoise: GainNode;
  let bass: GainNode;
  let chat: GainNode;
  let glitch: GainNode;
  let simulate: GainNode;
  let active: GainNode;

  beforeEach(() => {
    master = makeNode();
    sinewave = makeNode();
    feedback = makeNode();
    whitenoise = makeNode();
    bass = makeNode();
    chat = makeNode();
    glitch = makeNode();
    simulate = makeNode();
    active = makeNode();
    gainState.masterGain = master;
    gainState.sinewaveMixGain = sinewave;
    gainState.feedbackMixGain = feedback;
    gainState.whitenoiseMixGain = whitenoise;
    gainState.bassMixGain = bass;
    gainState.chatGain = chat;
    gainState.glitchGain = glitch;
    gainState.simulateMixGain = simulate;
    gainState.oscGain = active;
    contextState.audioContext = { currentTime: 1.5 } as AudioContext;
  });

  it("グローバル対象のミックスバスへ即時適用する", () => {
    applyGlobalGain({
      ...GAIN_STATE,
      MASTER: 0.5,
      SINEWAVE: 0.3,
      FEEDBACK: 0.4,
      WHITENOISE: 0.5,
      BASS: 1.2,
      CHAT: 1.1,
      GLITCH: 0,
      SIMULATE: 0.8,
      METRONOME: 0.7,
    });

    expect(master.gain.setTargetAtTime).toHaveBeenCalledWith(0.5, 1.5, 0.01);
    expect(sinewave.gain.setTargetAtTime).toHaveBeenCalledWith(0.3, 1.5, 0.01);
    expect(feedback.gain.setTargetAtTime).toHaveBeenCalledWith(0.4, 1.5, 0.01);
    expect(whitenoise.gain.setTargetAtTime).toHaveBeenCalledWith(0.5, 1.5, 0.01);
    expect(bass.gain.setTargetAtTime).toHaveBeenCalledWith(1.2, 1.5, 0.01);
    expect(chat.gain.setTargetAtTime).toHaveBeenCalledWith(1.1, 1.5, 0.01);
    expect(glitch.gain.setTargetAtTime).toHaveBeenCalledWith(0, 1.5, 0.01);
    expect(simulate.gain.setTargetAtTime).toHaveBeenCalledWith(0.8, 1.5, 0.01);
    expect(getGlobalGainValue("METRONOME")).toBe(0.7);
    // 発音中/停止を制御する active GainNode は触らない。
    expect(active.gain.setTargetAtTime).not.toHaveBeenCalled();
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

  it("METRONOME は GainNode を持たず、最新値を保持する", () => {
    applyGlobalGainValue("METRONOME", 0.75);

    expect(getGlobalGainValue("METRONOME")).toBe(0.75);
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
    expect(isGlobalGainKey("SINEWAVE")).toBe(true);
    expect(isGlobalGainKey("FEEDBACK")).toBe(true);
    expect(isGlobalGainKey("WHITENOISE")).toBe(true);
    expect(isGlobalGainKey("BASS")).toBe(true);
    expect(isGlobalGainKey("CHAT")).toBe(true);
    expect(isGlobalGainKey("GLITCH")).toBe(true);
    expect(isGlobalGainKey("SIMULATE")).toBe(true);
    expect(isGlobalGainKey("METRONOME")).toBe(true);
    expect(isGlobalGainKey("CLICK")).toBe(false);
  });

  it("既定値を持つ", () => {
    expect(GAIN_DEFAULTS.SINEWAVE).toBe(0.2);
    expect(GAIN_DEFAULTS.METRONOME).toBe(0.9);
  });
});
