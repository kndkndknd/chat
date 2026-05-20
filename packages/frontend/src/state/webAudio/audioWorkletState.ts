export const audioWorkletState = {
  chat: {
    audioWorklet: null as AudioWorkletNode | ScriptProcessorNode | null,
    length: 8192,
    flag: {
      CHAT: false,
      PLAYBACK: false,
      TIMELAPSE: false,
    } as {
      [key: string]: boolean;
    },
    recordIndex: {
      PLAYBACK: 0,
    } as {
      [key: string]: number;
    },
  },
  whitenoise: {
    audioWorklet: null as AudioWorkletNode | ScriptProcessorNode | null,
  },
};
