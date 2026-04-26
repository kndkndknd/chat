import { io } from "socket.io-client";

socketState.socket = io();
socketState.socketId = socketState.socket.id;

import { initialize } from "./initialize";
import { socket } from "./socket";

import { bpmStreamStateType, filterStateType } from "../../../types";

import {
  flagState,
  socketState,
  stereoPannerState,
  streamState,
  voiceState,
  webRtcState,
} from "./state";

import { textPrint, canvasSizing } from "./canvasEvent";
import { keyDown } from "./textInput";

import { simulateWorklet } from "./audioWorklet/simulateWorklet";

const ua = navigator.userAgent.toLowerCase();
flagState.isMobile = /iphone|ipad|ipod|android/.test(ua);

// let cinemaFlag = false;

voiceState.speechSynthesis = new SpeechSynthesisUtterance();

let stringsClient = "";

let eListener = <HTMLElement>document.getElementById("wrapper");
eListener.addEventListener(
  "click",
  () => {
    if (!flagState.start) {
      initialize(socketState.socket).then(async(stream) => {
        if (stream !== null) {
          streamState.stream = stream;
          // initTorch();
          // torchToggle(false);
          await simulateWorklet(stream);
        } else {
          textPrint("not support navigator.mediaDevices.getUserMedia", {
            timeout: true,
            timeoutDuration: 5000,
          });
        }
      });
    }
  },
  false,
);

window.addEventListener("resize", (e) => {
  console.log("resizing");
  canvasSizing(socketState.socket);
  // hlsSizing();
});
canvasSizing();
// hlsSizing();

document.addEventListener("keydown", (e) => {
  console.log(e);
  if (e.key === "Enter" && !flagState.start) {
    initialize(socketState.socket).then((stream) => {
      if (stream !== null) {
        streamState.stream = stream;

      } else {
        textPrint("not support navigator.mediaDevices.getUserMedia", {
          timeout: true,
          timeoutDuration: 5000,
        });
      }
    });
  } else {
    stringsClient = keyDown(e, stringsClient, socketState.socket);
  }
});

socket();

// video2 for buffer
webRtcState.videoPlayer = <HTMLVideoElement>document.getElementById("video2");

// socketState.socket.on("bufferFromServer", (data) => {
//   const uint8Array = new Uint8Array(data);
//   const blob = new Blob([uint8Array]);
//   const url = URL.createObjectURL(blob);
//   // videoElement.src = url;
//   videoPlayer.src = url;
//   textPrint("buffer");
// });

// // webRtc関連
// socketState.socket.on("candidateReqFromServer", (peers: string[]) => {
//   textPrint("room " + peers.join(","));
//   if (stream !== null) {
//     initRtpPeerConnection(socketState.socket, stream as MediaStream, peers);
//   }
// });

// socketState.socket.on("iceCandidateFromServer", async (candidate) => {
//   await receiveIceCandidate(candidate);
// });

// socketState.socket.on("offerRequestFromServer", async () => {
//   await createOffer(socketState.socket);
// });

// socketState.socket.on("offerFromServer", async (data) => {
//   await receiveOffer(socketState.socket, data);
// });

// socketState.socket.on("answerReqFromServer", async () => {
//   await createAnswer(socketState.socket);
// });

// socketState.socket.on("answerFromServer", async (answer) => {
//   await receiveAnswer(answer);
// });

// // disconnect時、1秒後再接続
// socketState.socket.on("disconnect", () => {
//   console.log("disconnect");
//   setTimeout(() => {
//     socketState.socket.connect();
//   }, 1000);
// });

// export const initialize = async () => {
//   erasePrint();

//   await initVideo();
//   await initAudio();

//   const SUPPORTS_MEDIA_DEVICES = "mediaDevices" in navigator;
//   if (SUPPORTS_MEDIA_DEVICES && navigator.mediaDevices.getUserMedia) {
//     const devices = await navigator.mediaDevices.enumerateDevices();
//     /*
//     const cameras = devices.filter((device) => device.kind === "videoinput");
//     if (cameras.length === 0) {
//       throw "No camera found on this device.";
//     }
//     //    const camera = cameras[cameras.length - 1]
//     const camera = cameras[0];
//     */
//     const mics = devices.filter((device) => device.kind === "audioinput");
//     console.log(mics);
//     console.log("mic length", mics.length);
//     // if(window.location.pathname.includes("pi")){

//     // }
//     /*
//     const mic = mics.filter((element)=>{
//       if(element.label.includes("Microphone Array")){
//         console.log(element.label)
//         return element
//       }
//     })[0]
//     console.log(mics)
//     console.log(mic)
//     */
//     const audioOption = window.location.pathname.includes("pi")
//       ? {
//           sampleRate: { ideal: 44100 },
//           echoCancellation: false,
//           noiseSuppression: false,
//           autoGainControl: false,
//           deviceId: mics[2].deviceId,
//         }
//       : {
//           sampleRate: { ideal: 44100 },
//           echoCancellation: false,
//           noiseSuppression: false,
//           autoGainControl: false,
//         };

//     stream = await navigator.mediaDevices.getUserMedia({
//       video: {
//         //facingMode: 'environment'
//         // deviceId: camera.deviceId,
//         // facingMode: ['user', 'environment'],
//         // height: {ideal: 1080},
//         // width: {ideal: 1920}
//       },
//       audio: audioOption,
//     });
//     await initAudioStream(stream);
//     await initVideoStream(stream);
//     await console.log(stream);
//     await textPrint("initialized");
//     await socketState.socket.emit("connectFromClient", {
//       clientMode:
//         window.location.pathname.includes("noStream") ||
//         window.location.pathname.includes("nostream")
//           ? "noStream"
//           : "client",
//       urlPathName: window.location.pathname,
//       width: window.innerWidth,
//       height: window.innerHeight,
//       isMobile: isMobile,
//     });

//     if (isMobile) {
//       sensorTimeIntervalId = window.setInterval(() => {
//         getAcceleration()
//           .then((acceleration) => {
//             accelerationData.x = acceleration.x;
//             accelerationData.y = acceleration.y;
//             accelerationData.z = acceleration.z;
//             accelerationData.timestamp = acceleration.timestamp;
//           })
//           .catch((error) => {
//             console.error("加速度センサーの取得に失敗:", error);
//           });
//         if (flagState.gpsFlag) {
//           getGPSPosition()
//             .then((position) => {
//               gpsPosition.latitude = position.latitude;
//               gpsPosition.longitude = position.longitude;
//             })
//             .catch((error) => {
//               console.error("GPS位置情報の取得に失敗:", error);
//             });
//           const frequency =
//             20 +
//             440 *
//               Math.sqrt(
//                 Math.pow(gpsPosition.latitude - originlat, 2) +
//                   Math.pow(gpsPosition.longitude - originlng, 2)
//               );
//           gpsOsc(true, frequency, 0, 1, 1);
//           textPrint(String(frequency) + "Hz");
//         } else {
//           gpsOsc(false, 440, 0, 1, 1);
//         }
//         if (flagState.accelarateFlag) {
//           const frequency =
//             20 +
//             20 *
//               Math.sqrt(
//                 Math.pow(accelerationData.x, 2) +
//                   Math.pow(accelerationData.y, 2) +
//                   Math.pow(accelerationData.z, 2)
//               );
//           accelarateOsc(true, frequency, 0, 1, 1);
//           textPrint(String(frequency) + "Hz");
//         } else {
//           accelarateOsc(false, 440, 0, 1, 1);
//         }
//       }, 500);
//     } else {
//       console.log("GPSまたは加速度センサーがサポートされていません");
//     }
//     await setTimeout(() => {
//       erasePrint();
//     }, 500);
//   } else {
//     textPrint("not support navigator.mediaDevices.getUserMedia");
//   }

//   flagState.start = true;
//   // streamFlag.timelapse = true;
//   timelapseState.flag = true;
//   timelapseState.trriger = false;
//   timelapseState.setIntervalId = window.setInterval(() => {
//     if (timelapseState.flag) {
//       timelapseState.trriger = true;
//     }
//   }, 60000);

//   /*
//   quantize(100)

// setTimeout(() => {
//   stopQuantize()
// },5000)

//   */
// };

textPrint("click screen");

if(window.location.pathname.includes("left")) {
  textPrint("left");
  stereoPannerState.masterPannerParam = -1;
} else if (window.location.pathname.includes("right")) {
  textPrint("right");
  stereoPannerState.masterPannerParam = 1;
}

//debugOn
