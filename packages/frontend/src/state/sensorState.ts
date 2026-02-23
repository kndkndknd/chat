export const sensorState = {
  isMobile: false,
  accelerationData: {
    x: 0,
    y: 0,
    z: 0,
    timestamp: 0,
  },
  gpsPosition: {
    latitude: 0,
    longitude: 0,
    originlat: 35.7323529,
    originlng: 139.8839623,
  },
  sensorTimeIntervalId: null as number | null,
};
