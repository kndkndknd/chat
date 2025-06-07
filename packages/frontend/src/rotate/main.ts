import { io } from "socket.io-client";
import { contextState } from "./contextState";
import { socketState } from "../state";
import { chordState } from "./chordState";
import { flagState } from "../state";
import { keyWaitState } from "./keyWaitState";

socketState.socket = io();
socketState.socketId = socketState.socket.id;

import { textPrint, erasePrint, canvasSizing } from "../canvasEvent";

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

// import { cmdFromServer } from "../cmd";
import { oscArrState } from "./oscArrState";

// import { keyDown } from "../textInput";

// let start = false;

const portament = 5;
const fade = 2.5;
const gain = 1;
const timeout = 25416;
const keyWait = 1000;

let eListener = <HTMLElement>document.getElementById("wrapper");
eListener.addEventListener(
  "click",
  () => {
    if (!flagState.start) {
      initialize();
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
    initialize();
  } else {
    if (!keyWaitState.listening) {
      keyWaitState.listening = true;
    }
    if (keyWaitState.keywaitTimeoutId !== null) {
      clearTimeout(keyWaitState.keywaitTimeoutId);
    }
    chordState.push(keyDown(e));
    keyWaitState.keywaitTimeoutId = window.setTimeout(() => {
      const text = chordState
        .map((chord) => {
          return chord.char;
        })
        .join(" + ");
      erasePrint();
      textPrint(text);
      chordStart();
      keyWaitState.listening = false;
      keyWaitState.keywaitTimeoutId = null;
      keyWaitState.ratationTimeoutId = window.setTimeout(() => {
        chordStop();
        chordState.length = 0;
        console.log("chordState", chordState);
        socketState.socket.emit("startRotationFromSmartphone");
        erasePrint();
      }, timeout);
    }, keyWait);
  }
});

socketState.socket.on("startRotationFromServer", () => {
  erasePrint();
});

socketState.socket.on("stopRotationFromServer", () => {
  if (keyWaitState.keywaitTimeoutId !== null) {
    clearTimeout(keyWaitState.keywaitTimeoutId);
  }
  if (keyWaitState.ratationTimeoutId !== null) {
    clearTimeout(keyWaitState.ratationTimeoutId);
  }
  chordStop();
  chordState.length = 0;
  erasePrint();
  textPrint("STOP");
});

// socketState.socket.on(
//   "stringsFromServer",
//   (data: { strings: string; timeout: boolean }) => {
//     // erasePrint(stx, strCnvs);
//     erasePrint();
//     console.log("stringsFromServer", data);
//     stringsClient = data.strings;
//     textPrint(stringsClient);
//     if (data.timeout) {
//       setTimeout(() => {
//         erasePrint();
//       }, 500);
//     }
//     if (cinemaFlag) {
//       setTimeout(() => {
//         erasePrint();
//       }, 500);
//     }
//   }
// );
// socketState.socket.on("erasePrintFromServer", () => {
//   // erasePrint(stx, strCnvs)
//   erasePrint();
// });

// socketState.socket.on(
//   "cmdFromServer",
//   (cmd: {
//     cmd: string;
//     property: string;
//     value: number;
//     flag: boolean;
//     target?: string;
//     overlay?: boolean;
//     fade?: number;
//     portament?: number;
//     gain?: number;
//     solo?: boolean;
//   }) => {
//     cmdFromServer(cmd);
//     stringsClient = "";
//   }
// );

// socketState.socket.on(
//   "stopFromServer",
//   (data: { fadeOutVal: number; target?: string }) => {
//     erasePrint();
//     if (data.target === undefined || data.target === "ALL") {
//       stopCmd(data.fadeOutVal);
//     } else if (data.target === "ExceptHls") {
//       stopCmd(data.fadeOutVal, "HLS");
//     }
//     // erasePrint(stx, strCnvs)
//     textPrint("STOP");
//     setTimeout(() => {
//       erasePrint();
//     }, 800);
//   }
// );

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

const initialize = () => {
  erasePrint();
  initAudio();
  socketState.socket.emit("connectFromRotatingSmartphone");
};

textPrint("click screen");

const chordStart = () => {
  const currentTime = contextState.audioContext.currentTime;
  for (let i = 0; i < chordState.length; i++) {
    if (oscArrState !== null && oscArrState.length > i) {
      oscArrState[i].osc.frequency.setTargetAtTime(
        chordState[i].frequency,
        currentTime,
        portament
      );
      oscArrState[i].gain.gain.setTargetAtTime(gain, currentTime, fade);
    } else {
      oscArrState.push({
        osc: contextState.audioContext.createOscillator(),
        gain: contextState.audioContext.createGain(),
      });
      oscArrState[i].osc.frequency.setTargetAtTime(
        chordState[i].frequency,
        currentTime,
        portament
      );
      oscArrState[i].gain.gain.setTargetAtTime(gain, currentTime, fade);
      oscArrState[i].osc.connect(oscArrState[i].gain);
      oscArrState[i].gain.connect(contextState.masterGain);
      oscArrState[i].osc.start(0);
    }
  }
};

const chordStop = () => {
  const currentTime = contextState.audioContext.currentTime;
  for (let i = 0; i < oscArrState.length; i++) {
    oscArrState[i].gain.gain.setTargetAtTime(0, currentTime, fade);
  }
};
