type MuteListener = (flag: boolean) => void;

const listeners = new Set<MuteListener>();

// グローバルミュートの変更を、WebAudio 以外の音声出力（WebRTC など）へ伝える。
export const onMuteChange = (listener: MuteListener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const emitMuteChange = (flag: boolean): void => {
  listeners.forEach((listener) => listener(flag));
};
