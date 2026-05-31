// ナイトモード用の消音制御。
// ナイトモード移行時に masterGain を 0 にして全音源を消音し、
// 解除時に移行前の値へ戻す。BLACK モード(画面の暗転)とは独立した制御で、
// 単発の "BLACK" コマンドでは消音しない(ナイトモード専用)。
import { gainState, contextState } from "./state";

// 移行前の masterGain 値。消音中のみ値を保持し、解除時に復元して null へ戻す。
let savedMasterGain: number | null = null;

export const muteMasterForNight = (): void => {
  const node = gainState.masterGain;
  if (!node || !contextState.audioContext) return;
  // 既に消音中なら元の値を上書き保存しない(二重適用で 0 を保存しないため)。
  if (savedMasterGain === null) {
    savedMasterGain = node.gain.value;
  }
  node.gain.setTargetAtTime(0, contextState.audioContext.currentTime, 0);
};

export const restoreMasterForNight = (): void => {
  const node = gainState.masterGain;
  if (!node || !contextState.audioContext) return;
  const value = savedMasterGain ?? 1;
  node.gain.setTargetAtTime(value, contextState.audioContext.currentTime, 0);
  savedMasterGain = null;
};
