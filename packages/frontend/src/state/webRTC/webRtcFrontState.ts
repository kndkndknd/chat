export const webRtcFrontState: {
  peerConnection: RTCPeerConnection | null;
  isInitialized: boolean;
  isCandidated: boolean;
  isConnected: boolean;
  remoteVideo: HTMLVideoElement | null;
  peers: string[];
} = {
  peerConnection: null,
  isInitialized: false,
  isCandidated: false,
  isConnected: false,
  remoteVideo: null,
  peers: [],
};
