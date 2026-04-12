// import { metronomeState, socketState } from "./state";

// socketState.socket = io();
// socketState.socketId = socketState.socket.id;
import { initWebSocket } from "./webSocket";
import { clientId } from "./webSocket/clientId";

import {
  flagState,
  timelapseState,
  urlState,
} from "./state";
``;

import {
  initVideo,
  initVideoStream,
  textPrint,
  erasePrint,
  showImage,
  emojiState,
  canvasSizing,
} from "./canvasEvent";

import {
  initAudio,
} from "./webaudio";

import {
  initAudioStream,
} from "./stream";

import { chatWorklet } from "./audioWorklet/chatWorklet";
import { keyDown } from "./textInput";

// let start = false;

urlState.localServer = new URL(window.location.href).origin.replace(
  "https://",
  "",
);
console.log("Local server URL:", urlState.localServer);

const ws = initWebSocket();

let cinemaFlag = false;
let clockModeId: number = 0;
const clientMode = "client";

let clockBase = 0;

let stringsClient = "";

let eListener = <HTMLElement>document.getElementById("wrapper");
eListener.addEventListener(
  "click",
  () => {
    if (!flagState.start) {
      initialize();
    }
  },
  false,
);

window.addEventListener("resize", (e) => {
  console.log("resizing");
  canvasSizing();
});
canvasSizing();

document.addEventListener("keydown", (e) => {
  console.log(e);
  if (e.key === "Enter" && !flagState.start) {
    initialize();
  } else {
    stringsClient = keyDown(e, stringsClient);
  }
});

export const initialize = async () => {
  erasePrint();

  await initVideo();
  await initAudio();

  const SUPPORTS_MEDIA_DEVICES = "mediaDevices" in navigator;
  if (SUPPORTS_MEDIA_DEVICES && navigator.mediaDevices.getUserMedia) {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const mics = devices.filter((device) => device.kind === "audioinput");
    console.log(mics);
    console.log("mic length", mics.length);
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

    await initAudioStream(stream);
    await initVideoStream(stream);
    // await console.log(stream);
    await chatWorklet(stream);

    await textPrint("initialized");
    await ws.send(
      JSON.stringify({
        type: "register",
        clientId: clientId,
      }),
    );
    await setTimeout(() => {
      erasePrint();
    }, 500);
  } else {
    textPrint("not support navigator.mediaDevices.getUserMedia");
  }

  flagState.start = true;
  timelapseState.flag = false;
  timelapseState.setIntervalId = window.setInterval(() => {
    flagState.timelapse = true;
  }, 60000);

};
textPrint("click screen");
