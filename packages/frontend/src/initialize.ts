import { SocketFacade } from "./socket/SocketFacade";
import {
  flagState,
  sensorState,
  timelapseState,
  torchState,
  audioWorkletState,
  streamState,
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
import { chatWorklet } from "./audioWorklet/chatWorklet";
import { initFaceDetection } from "./faceApi";
// import { initRecordButton } from "./recording";
// import { toggleRecording } from "./recording";
import { startChunkedRecording } from "./recording";

export const initialize = async (
  socket: SocketFacade,
): Promise<MediaStream | null> => {
  // ): Promise<void> => {
  erasePrint();
  await initVideo();
  await initAudio();

  const SUPPORTS_MEDIA_DEVICES = "mediaDevices" in navigator;
  const SUPPORTED_CONSTRAINTS =
    navigator.mediaDevices.getSupportedConstraints();
  console.log("SUPPORTED_CONSTRAINTS:", SUPPORTED_CONSTRAINTS);
  const torchSupported = "torch" in SUPPORTED_CONSTRAINTS;
  torchState.isSupported = torchSupported;
  if (SUPPORTS_MEDIA_DEVICES && navigator.mediaDevices.getUserMedia) {

    const devices = await navigator.mediaDevices.enumerateDevices();
    /*
    const cameras = devices.filter((device) => device.kind === "videoinput");
    if (cameras.length === 0) {
      throw "No camera found on this device.";
    }
    //    const camera = cameras[cameras.length - 1]
    const camera = cameras[0];
    */
    const mics = devices.filter((device) => device.kind === "audioinput");
    console.log(mics);
    console.log("mic length", mics.length);
    // if(window.location.pathname.includes("pi")){

    // }
    /*
    const mic = mics.filter((element)=>{
      if(element.label.includes("Microphone Array")){
        console.log(element.label)
        return element
      }
    })[0]
    console.log(mics)
    console.log(mic)
    */
    const audioOption = window.location.pathname.includes("pi")
      ? {
          sampleRate: { ideal: 44100 },
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          deviceId: mics[2].deviceId,
        }
      : {
          sampleRate: { ideal: 44100 },
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        };

    // streamState.stream = !flagState.isMobile
    // const stream = !flagState.isMobile ?
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        //facingMode: 'environment'
        // deviceId: camera.deviceId,
        // facingMode: ['user', 'environment'],
        // height: {ideal: 1080},
        // width: {ideal: 1920}
      },
      audio: audioOption,
    });
    // : await navigator.mediaDevices.getUserMedia({
    //     video: {
    //       facingMode: "environment",
    //       torch: true,
    //     },
    //     audio: audioOption,
    //   });
    await initAudioStream(stream);
    await initVideoStream(stream);
    // await initAudioStream(streamState.stream);
    // await initVideoStream(streamState.stream);
    // await console.log(stream);
    await chatWorklet(stream, socket);
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
      initFaceDetection().catch((e) => console.error("faceDetection init error:", e));
    }
    // initRecordButton(stream);
    startChunkedRecording(stream);
    // streamFlag.timelapse = true;
    timelapseState.flag = true;
    // timelapseState.trriger = false;
    audioWorkletState.chat.flag.TIMELAPSE = false;
    timelapseState.setIntervalId = window.setInterval(() => {
      if (timelapseState.flag) {
        audioWorkletState.chat.flag.TIMELAPSE = true;
      }
    }, 60000);
    // await toggleRecording(stream);


    return stream;
  } else {
    // "not support navigator.mediaDevices.getUserMedia";
    return null;
  }
};
