export const streamState = {
  stream: <MediaStream | null>null,
  videoTrack: <MediaStreamTrack | null>null,
  loop: <{ [key: string]: string[] }>{
    CHAT: [],
    PLAYBACK: [],
    TIMELAPSE: [],
  },
};
