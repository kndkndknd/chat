import { SocketFacade } from "./socket/SocketFacade";
import {
  flagState,
  sensorState,
  timelapseState,
  audioWorkletState,
} from "./state";
import { initAudio } from "./webaudio";
import {
  initVideo,
  initVideoStream,
  textPrint,
  erasePrint,
} from "./canvasEvent";
import { initAudioStream } from "./stream";
import { getAcceleration } from "./sensor";
import { getGPSPosition } from "./gps";
import { accelarateOsc, gpsOsc } from "./webaudio";
import { initFaceDetection } from "./faceApi";
import { startChunkedRecording } from "./recording";
import {
  chatScriptProcessor,
  initWhitenoiseScriptProcessor,
} from "./scriptProcessor";

type LegacyGetUserMedia = (
  constraints: MediaStreamConstraints,
  success: (stream: MediaStream) => void,
  error: (err: unknown) => void,
) => void;

const getLegacyGetUserMedia = (): LegacyGetUserMedia | null => {
  const nav = navigator as any;
  const gum =
    nav.getUserMedia ||
    nav.webkitGetUserMedia ||
    nav.mozGetUserMedia ||
    nav.msGetUserMedia;
  return gum ? gum.bind(navigator) : null;
};

const legacyGetUserMedia = (
  constraints: MediaStreamConstraints,
): Promise<MediaStream> => {
  const gum = getLegacyGetUserMedia();
  if (!gum) return Promise.reject(new Error("getUserMedia not supported"));
  return new Promise((resolve, reject) => {
    gum(constraints, resolve, reject);
  });
};

export const initializeSnowleopard = async (
  socket: SocketFacade,
): Promise<MediaStream | null> => {
  erasePrint();
  await initVideo();
  await initAudio(initWhitenoiseScriptProcessor);

  if (!getLegacyGetUserMedia()) {
    return null;
  }

  let stream: MediaStream;
  try {
    stream = await legacyGetUserMedia({
      video: true,
      audio: true,
    });
  } catch (err) {
    console.error("getUserMedia error:", err);
    return null;
  }

  await initAudioStream(stream);
  await initVideoStream(stream);
  await chatScriptProcessor(stream, socket);
  await textPrint("initialized", { timeout: true });
  await socket.emit("connectFromClient", {
    clientMode:
      window.location.pathname.includes("noStream") ||
      window.location.pathname.includes("nostream")
        ? "noStream"
        : "client",
    urlPathName: window.location.pathname,
    width: window.innerWidth,
    height: window.innerHeight,
    isMobile: sensorState.isMobile,
  });

  if (sensorState.isMobile) {
    sensorState.sensorTimeIntervalId = window.setInterval(() => {
      getAcceleration()
        .then((acceleration) => {
          sensorState.accelerationData.x = acceleration.x;
          sensorState.accelerationData.y = acceleration.y;
          sensorState.accelerationData.z = acceleration.z;
          sensorState.accelerationData.timestamp = acceleration.timestamp;
        })
        .catch((error) => {
          console.error("加速度センサーの取得に失敗:", error);
        });
      if (flagState.gpsFlag) {
        getGPSPosition()
          .then((position) => {
            sensorState.gpsPosition.latitude = position.latitude;
            sensorState.gpsPosition.longitude = position.longitude;
          })
          .catch((error) => {
            console.error("GPS位置情報の取得に失敗:", error);
          });
        const frequency =
          20 +
          440 *
            Math.sqrt(
              Math.pow(
                sensorState.gpsPosition.latitude -
                  sensorState.gpsPosition.originlat,
                2,
              ) +
                Math.pow(
                  sensorState.gpsPosition.longitude -
                    sensorState.gpsPosition.originlng,
                  2,
                ),
            );
        gpsOsc(true, frequency, 0, 1, 1);
        textPrint(String(frequency) + "Hz");
      } else {
        gpsOsc(false, 440, 0, 1, 1);
      }
      if (flagState.accelarateFlag) {
        const frequency =
          20 +
          20 *
            Math.sqrt(
              Math.pow(sensorState.accelerationData.x, 2) +
                Math.pow(sensorState.accelerationData.y, 2) +
                Math.pow(sensorState.accelerationData.z, 2),
            );
        accelarateOsc(true, frequency, 0, 1, 1);
        textPrint(String(frequency) + "Hz");
      } else {
        accelarateOsc(false, 440, 0, 1, 1);
      }
    }, 500);
  } else {
    console.log("GPSまたは加速度センサーがサポートされていません");
  }

  flagState.start = true;
  if (
    window.location.pathname.includes("face") ||
    window.location.pathname.split("/").includes("1")
  ) {
    initFaceDetection().catch((e) =>
      console.error("faceDetection init error:", e),
    );
  }
  if (typeof MediaRecorder !== "undefined") {
    startChunkedRecording(stream);
  } else {
    console.warn("MediaRecorder is not supported in this browser");
  }
  timelapseState.flag = true;
  audioWorkletState.chat.flag.TIMELAPSE = false;
  timelapseState.setIntervalId = window.setInterval(() => {
    if (timelapseState.flag) {
      audioWorkletState.chat.flag.TIMELAPSE = true;
    }
  }, 60000);

  return stream;
};
