import { contextState, gainState } from "../../state";
import type { gainStateType } from "../../../../../types";

// グローバルミキサーとして全クライアントへ即時適用するキー。
// CLICK は発音ごとのゲインを使うため、ここには含めない。
export const GLOBAL_GAIN_KEYS = [
  "MASTER",
  "SINEWAVE",
  "FEEDBACK",
  "WHITENOISE",
  "BASS",
  "CHAT",
  "GLITCH",
  "SIMULATE",
  "METRONOME",
] as const;
export type GlobalGainKey = (typeof GLOBAL_GAIN_KEYS)[number];

// backend の cmdState.GAIN 既定値と一致させる。
// 音声初期化時にミックスバスへ設定し、gainFromServer で上書きする。
export const GAIN_DEFAULTS: Record<GlobalGainKey, number> = {
  MASTER: 1.0,
  SINEWAVE: 0.2,
  FEEDBACK: 0.6,
  WHITENOISE: 0.5,
  BASS: 1.5,
  CHAT: 1.5,
  GLITCH: 2.0,
  SIMULATE: 1.0,
  METRONOME: 0.9,
};

const globalGainValues: Record<GlobalGainKey, number> = {
  ...GAIN_DEFAULTS,
};

export const GAIN_MIN = 0;
export const GAIN_MAX = 2;

export const clampGainValue = (value: number): number =>
  Number.isFinite(value)
    ? Math.min(GAIN_MAX, Math.max(GAIN_MIN, value))
    : GAIN_MIN;

export const normalizeGainValue = (
  value: unknown,
  fallback: number,
): number =>
  typeof value === "number" && Number.isFinite(value)
    ? clampGainValue(value)
    : clampGainValue(fallback);

const nodeFor = (key: GlobalGainKey): GainNode | null => {
  switch (key) {
    case "MASTER":
      return gainState.masterGain;
    case "SINEWAVE":
      return gainState.sinewaveMixGain;
    case "FEEDBACK":
      return gainState.feedbackMixGain;
    case "WHITENOISE":
      return gainState.whitenoiseMixGain;
    case "BASS":
      return gainState.bassMixGain;
    case "CHAT":
      return gainState.chatGain;
    case "GLITCH":
      return gainState.glitchGain;
    case "SIMULATE":
      return gainState.simulateMixGain;
    case "METRONOME":
      // METRONOME は都度 click() を呼ぶため GainNode を持たない。
      return null;
  }
};

const setGain = (node: GainNode | null, value: number): void => {
  if (!node || !contextState.audioContext) return;
  // 急激な変更でクリックノイズが出ないよう、10ms で追従させる。
  node.gain.setTargetAtTime(
    value,
    contextState.audioContext.currentTime,
    0.01,
  );
};

export const isGlobalGainKey = (
  key: keyof gainStateType,
): key is GlobalGainKey =>
  (GLOBAL_GAIN_KEYS as readonly string[]).includes(key);

export const getGlobalGainValue = (key: GlobalGainKey): number =>
  globalGainValues[key];

export const applyGlobalGainValue = (
  key: GlobalGainKey,
  value: number,
): void => {
  if (typeof value !== "number" || !Number.isFinite(value)) return;
  const clamped = clampGainValue(value);
  globalGainValues[key] = clamped;
  setGain(nodeFor(key), clamped);
};

export const applyGlobalGain = (data: Partial<gainStateType>): void => {
  GLOBAL_GAIN_KEYS.forEach((key) => {
    const value = data[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      applyGlobalGainValue(key, value);
    }
  });
};
