export const videoBufferState: {
  flag: boolean;
  recording: boolean;
  mediaRecorder: MediaRecorder | null;
  uploadChain: Promise<void>;
  currentObjectUrl: string | null;
  videoElement: HTMLVideoElement | null;
  mediaSource: MediaSource;
  sourceBuffer: SourceBuffer | null;
  queue: ArrayBuffer[];
  appending: boolean;
  firstChunkFlag: boolean;
  playing: boolean;
  ready: boolean;
} = {
  flag: false,
  recording: false,
  mediaRecorder: null,
  uploadChain: Promise.resolve(),
  currentObjectUrl: null,
  videoElement: null,
  mediaSource: new MediaSource(),
  sourceBuffer: null,
  queue: [],
  appending: false,
  firstChunkFlag: true,
  playing: false,
  ready: false,
};
