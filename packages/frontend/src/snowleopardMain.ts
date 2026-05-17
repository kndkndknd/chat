import { SocketFacade } from "./socket/SocketFacade";

const wsUrl = `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws`;
socketState.socket = new SocketFacade(wsUrl);
socketState.socket.on("connected", (data) => {
  socketState.socketId = (data as { id: string }).id;
  if (flagState.start) {
    socketState.socket.emit("connectFromClient", {
      clientMode:
        window.location.pathname.includes("noStream") ||
        window.location.pathname.includes("nostream")
          ? "noStream"
          : "client",
      urlPathName: window.location.pathname,
      width: window.innerWidth,
      height: window.innerHeight,
      isMobile: flagState.isMobile,
    });
  }
});

import { initializeSnowleopard } from "./initializeSnowleopard";
import { socket } from "./socket";

import {
  flagState,
  socketState,
  streamState,
  voiceState,
  webRtcState,
} from "./state";

import { textPrint, canvasSizing } from "./canvasEvent";
import { keyDown } from "./textInput";

import { simulateScriptProcessor } from "./scriptProcessor";

const ua = navigator.userAgent.toLowerCase();
flagState.isMobile = /iphone|ipad|ipod|android/.test(ua);

voiceState.speechSynthesis = new SpeechSynthesisUtterance();

let stringsClient = "";

let eListener = <HTMLElement>document.getElementById("wrapper");
eListener.addEventListener(
  "click",
  () => {
    if (!flagState.start) {
      initializeSnowleopard(socketState.socket).then(async (stream) => {
        if (stream !== null) {
          streamState.stream = stream;
          await simulateScriptProcessor(stream);
        } else {
          textPrint("not support navigator.getUserMedia", {
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
});
canvasSizing();

document.addEventListener("keydown", (e) => {
  console.log(e);
  if (
    e.key === "Enter" &&
    !flagState.start &&
    window.location.pathname !== "nosound"
  ) {
    initializeSnowleopard(socketState.socket).then((stream) => {
      if (stream !== null) {
        streamState.stream = stream;
      } else {
        textPrint("not support navigator.getUserMedia", {
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

// video2 for buffer / remoteAudio for received audio
webRtcState.videoPlayer = <HTMLVideoElement>document.getElementById("video2");
webRtcState.audioPlayer = <HTMLAudioElement>document.getElementById("remoteAudio");

textPrint("click screen");

//debugOn
