export const audioWorkletState = {
  audioWorklet: null as AudioWorkletNode | null,
  length: 8192,
  flag: {
    CHAT: false,
    PLAYBACK: false,
    TIMELAPSE: false,
  } as {
    [key: string]: boolean;
  },
};
