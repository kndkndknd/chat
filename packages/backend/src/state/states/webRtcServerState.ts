type Room = {
  members: Set<string>;
};

export const webRtcServerState = {
  roomId: "roomId",
  rooms: new Map<string, Room>(),
  member: [],
  peerConnections: {},
  dataChannels: {},
  remoteStreams: {},
  localStreams: {},
};
