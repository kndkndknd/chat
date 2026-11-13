import { contextState, gainState } from "../../state";
import type { gainStateType } from "../../../../../types";

// グローバルミキサーとして全クライアントへ即時適用するキー。
// これ以外のキーは、各発音コマンドが実行されたときにゲインが適用される。
export const GLOBAL_GAIN_KEYS = ["MASTER", "CHAT", "GLITCH"] as const;
export type GlobalGainKey = (typeof GLOBAL_GAIN_KEYS)[number];

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
    case "CHAT":
      return gainState.chatGain;
    case "GLITCH":
      return gainState.glitchGain;
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

export const applyGlobalGainValue = (
  key: GlobalGainKey,
  value: number,
): void => {
  if (typeof value !== "number" || !Number.isFinite(value)) return;
  setGain(nodeFor(key), clampGainValue(value));
};

export const applyGlobalGain = (data: Partial<gainStateType>): void => {
  GLOBAL_GAIN_KEYS.forEach((key) => {
    const value = data[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      applyGlobalGainValue(key, value);
    }
  });
};
