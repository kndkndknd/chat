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

import { initialize } from "./initialize";
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
import { isBlackModeActive, disableBlackMode } from "./blackMode";

import { simulateWorklet } from "./audioWorklet/simulateWorklet";
import { SyncClient } from "./webRTC/syncClient";

const ua = navigator.userAgent.toLowerCase();
flagState.isMobile = /iphone|ipad|ipod|android/.test(ua);

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
});
canvasSizing();

document.addEventListener("keydown", (e) => {
  console.log(e);
  // BLACK モード中はなにか文字を入力したら解除する。
  // 解除のためのキーは通常入力として扱わず、そのキーで消えるだけにする。
  // ただし /counter 端末は文字入力による解除を無効にし、BLACK を維持する。
  if (isBlackModeActive()) {
    if (window.location.pathname !== "/counter") {
      disableBlackMode();
    }
    return;
  }
  if (e.key === "Enter" && !flagState.start && window.location.pathname !== "nosound") {
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

// remoteVideo / remoteAudio: WebRTC で受信したメディアを流す <video>/<audio>
webRtcState.videoPlayer = <HTMLVideoElement>document.getElementById("remoteVideo");
webRtcState.audioPlayer = <HTMLAudioElement>document.getElementById("remoteAudio");

// /webrtc 端末だけ、chat_sync の WebRTC ピアとして振る舞う。
// 無人運用のためロード時に initialize() を自動起動し (クリック/Enter を待たない)、
// SyncClient を開始する。getUserMedia / autoplay は Chrome にカメラ・マイク権限が
// 永続許可されている前提 (キオスク設定)。SyncClient.start() は streamState.stream の
// 準備を内部でリトライ待ちするため、initialize() と並行に呼んでよい。
if (window.location.pathname.includes("webrtc")) {
  if (!flagState.start) {
    initialize(socketState.socket).then(async (stream) => {
      if (stream !== null) {
        streamState.stream = stream;
        await simulateWorklet(stream);
      } else {
        textPrint("not support navigator.mediaDevices.getUserMedia", {
          timeout: true,
          timeoutDuration: 5000,
        });
      }
    });
  }
  const syncClient = new SyncClient();
  void syncClient.start();
}

textPrint("click screen");

//debugOn
