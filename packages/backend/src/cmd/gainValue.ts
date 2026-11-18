import type { gainStateType } from "../../../../types";

// GAIN UI / GAIN コマンドで共有するゲイン範囲。
// フロントのスライダー (0〜2) と揃える。
export const GAIN_MIN = 0;
export const GAIN_MAX = 2;

// gainStateType と一致させる。WS の入力検証と state の正規化で使う。
export const GAIN_KEYS = [
  "MASTER",
  "SINEWAVE",
  "FEEDBACK",
  "WHITENOISE",
  "CLICK",
  "BASS",
  "CHAT",
  "GLITCH",
  "SIMULATE",
  "METRONOME",
] as const satisfies readonly (keyof gainStateType)[];

export type GainKey = (typeof GAIN_KEYS)[number];

export const isGainKey = (key: string): key is GainKey =>
  (GAIN_KEYS as readonly string[]).includes(key);

export const clampGain = (value: number): number =>
  Number.isFinite(value)
    ? Math.min(GAIN_MAX, Math.max(GAIN_MIN, value))
    : GAIN_MIN;

// Redis から復元した古い値を 0〜2 に正規化する。
// 非有限値は安全側に倒して 0 にする。
export const normalizeGainState = (gain: gainStateType): void => {
  GAIN_KEYS.forEach((key) => {
    gain[key] = clampGain(gain[key]);
  });
};
