export const audioWorkletState = {
  chat: {
    audioWorklet: null as AudioWorkletNode | null,
    length: 8192,
    flag: {
      CHAT: false,
      PLAYBACK: false,
      TIMELAPSE: false,
    } as {
      [key: string]: boolean;
    },
  },
  whitenoise: {
    audioWorklet: null as AudioWorkletNode | null,
  },
};
