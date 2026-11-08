import { contextState, flagState, gainState } from "../state";
import { emitMuteChange } from "../state/muteState";

export const mute = (flag: boolean) => {
  // WebAudio の初期化前でも、状態と HLS / WebRTC 側のミュートは先に反映する。
  flagState.mute = flag;
  emitMuteChange(flag);

  if (!gainState.muteGain || !contextState.audioContext) return;

  gainState.muteGain.gain.setTargetAtTime(
    flag ? 0 : 1,
    contextState.audioContext.currentTime,
    0.01,
  );
};
