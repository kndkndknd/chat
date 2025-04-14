import { io } from "socket.io-client";
import { socketState } from "../state";

socketState.socket = io();
socketState.socketId = socketState.socket.id;

import { flagState } from "../state";

import {
  textPrint,
  erasePrint,
  showImage,
  emojiState,
  canvasSizing,
} from "../canvasEvent";

import { keyDown } from "./keyDown";

// import {
//   initAudio,
//   click,
//   stopCmd,
//   // recordReqFromServer,
//   gainChange,
//   streamPlay,
// } from "../webaudio";

import { initAudio } from "./initAudio";

import { cmdFromServer } from "../cmd";

// import { keyDown } from "../textInput";

// let start = false;

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
      erasePrint();
      initAudio();
    }
  },
  false
);

window.addEventListener("resize", (e) => {
  console.log("resizing");
  canvasSizing(socketState.socket);
});
canvasSizing();

document.addEventListener("keydown", (e) => {
  console.log(e);
  if (e.key === "Enter" && !flagState.start) {
    erasePrint();
    initAudio();
  } else {
    stringsClient = keyDown(e, stringsClient, socketState.socket);
  }
});

socketState.socket.on(
  "stringsFromServer",
  (data: { strings: string; timeout: boolean }) => {
    // erasePrint(stx, strCnvs);
    erasePrint();
    console.log("stringsFromServer", data);
    stringsClient = data.strings;
    textPrint(stringsClient);
    if (data.timeout) {
      setTimeout(() => {
        erasePrint();
      }, 500);
    }
    if (cinemaFlag) {
      setTimeout(() => {
        erasePrint();
      }, 500);
    }
  }
);
socketState.socket.on("erasePrintFromServer", () => {
  // erasePrint(stx, strCnvs)
  erasePrint();
});

socketState.socket.on(
  "cmdFromServer",
  (cmd: {
    cmd: string;
    property: string;
    value: number;
    flag: boolean;
    target?: string;
    overlay?: boolean;
    fade?: number;
    portament?: number;
    gain?: number;
    solo?: boolean;
  }) => {
    cmdFromServer(cmd);
    stringsClient = "";
  }
);

socketState.socket.on(
  "stopFromServer",
  (data: { fadeOutVal: number; target?: string }) => {
    erasePrint();
    if (data.target === undefined || data.target === "ALL") {
      stopCmd(data.fadeOutVal);
    } else if (data.target === "ExceptHls") {
      stopCmd(data.fadeOutVal, "HLS");
    }
    // erasePrint(stx, strCnvs)
    textPrint("STOP");
    setTimeout(() => {
      erasePrint();
    }, 800);
  }
);

// socketState.socket.on("textFromServer", (data: { text: string }) => {
//   erasePrint();
//   textPrint(data.text);
//   if (cinemaFlag) {
//     setTimeout(() => {
//       erasePrint();
//     }, 500);
//   }
// });

// disconnect時、1秒後再接続
socketState.socket.on("disconnect", () => {
  console.log("disconnect");
  setTimeout(() => {
    socketState.socket.connect();
  }, 1000);
});

textPrint("click screen");

//debugOn
