// ナイトモード用の消音制御。
// ナイトモード移行時に masterGain と glitchGain を 0 にして全音源を消音し、
// 解除時に移行前の値へ戻す。glitchGain は masterGain を経由せず直接 destination に
// 繋がっているため、別途 0 にしないと glitch 音が残る。
// BLACK モード(画面の暗転)とは独立した制御で、
// 単発の "BLACK" コマンドでは消音しない(ナイトモード専用)。
import { gainState, contextState } from "./state";

// 移行前のゲイン値。消音中のみ値を保持し、解除時に復元して null へ戻す。
let savedMasterGain: number | null = null;
let savedGlitchGain: number | null = null;

export const muteMasterForNight = (): void => {
  const ctx = contextState.audioContext;
  if (!ctx) return;
  if (gainState.masterGain) {
    // 既に消音中なら元の値を上書き保存しない(二重適用で 0 を保存しないため)。
    if (savedMasterGain === null) {
      savedMasterGain = gainState.masterGain.gain.value;
    }
    gainState.masterGain.gain.setTargetAtTime(0, ctx.currentTime, 0);
  }
  if (gainState.glitchGain) {
    if (savedGlitchGain === null) {
      savedGlitchGain = gainState.glitchGain.gain.value;
    }
    gainState.glitchGain.gain.setTargetAtTime(0, ctx.currentTime, 0);
  }
};

export const restoreMasterForNight = (): void => {
  const ctx = contextState.audioContext;
  if (!ctx) return;
  if (gainState.masterGain) {
    gainState.masterGain.gain.setTargetAtTime(savedMasterGain ?? 1, ctx.currentTime, 0);
    savedMasterGain = null;
  }
  if (gainState.glitchGain) {
    gainState.glitchGain.gain.setTargetAtTime(savedGlitchGain ?? 1.5, ctx.currentTime, 0);
    savedGlitchGain = null;
  }
};
