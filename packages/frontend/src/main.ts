import { io } from "socket.io-client";
import { metronomeState, socketState } from "./state";
import { bpmClientStateType } from "../../../types";
import { bpmStreamStateType, filterStateType } from "../../../types";

socketState.socket = io();
socketState.socketId = socketState.socket.id;

import {
  flagState,
  streamFlagState,
  timelapseState,
  streamChunk,
  voiceState,
  quantizeState,
  audioWorkletState,
} from "./state";

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
  click,
  // stopCmd,
  // recordReqFromServer,
  gainChange,
  // streamPlay,
  accelarateOsc,
  gpsOsc,
} from "./webaudio";

import {
  chatReq,
  recordReqFromServer,
  initAudioStream,
  streamPlay,
} from "./stream";
import { quantize, quantizePlay, quantizeStop } from "./quantize";

import { cmdFromServer, stopCmd } from "./cmd";

import { keyDown } from "./textInput";

import { newWindowReqType } from "../../../types";
import { enableClockMode, disableClockMode } from "./clientMode/clockMode";
import { hlsVideoPlay, hlsSizing } from "./hlsVideo";
import { quantizeFromServer } from "./quantize/quantizeFromServer";
import { text } from "node:stream/consumers";
import { setQuantize } from "./quantize/setQuantize";
import { speechVoice } from "./voice";
import { time } from "node:console";

import { getGPSPosition, watchGPSPosition } from "./gps";
import { getAcceleration } from "./sensor";

import { initAudioWorklet } from "./audioWorklet/main";

// let start = false;

const ua = navigator.userAgent.toLowerCase();
const isMobile = /iphone|ipad|ipod|android/.test(ua);
const isAndroid = /android/.test(ua);

let cinemaFlag = false;
let clockModeId: number = 0;
const clientMode = "client";

let clockBase = 0;

voiceState.speechSynthesis = new SpeechSynthesisUtterance();

let stringsClient = "";
let sensorTimeIntervalId: number | null = null;
const gpsPosition = {
  latitude: 0,
  longitude: 0,
};

const originlat = 35.7323529;
const originlng = 139.8839623;

const accelerationData = {
  x: 0,
  y: 0,
  z: 0,
  timestamp: 0,
};

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
  hlsSizing();
});
canvasSizing();
hlsSizing();

document.addEventListener("keydown", (e) => {
  console.log(e);
  if (e.key === "Enter" && !flagState.start) {
    initialize();
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

socketState.socket.on("textFromServer", (data: { text: string }) => {
  erasePrint();
  textPrint(data.text);
  if (cinemaFlag) {
    setTimeout(() => {
      erasePrint();
    }, 500);
  }
});

socketState.socket.on("chatReqFromServer", () => {
  // chatReq(String(socketState.socket.id));
  audioWorkletState.flag.CHAT = true;
  setTimeout(() => {
    erasePrint();
  }, 1000);
});

socketState.socket.on(
  "recordReqFromServer",
  (data: { source: string; timeout: number }) => {
    recordReqFromServer(data);
    textPrint("RECORD");
    setTimeout(() => {
      erasePrint();
    }, data.timeout);
  }
);

// CHATのみ向けにする
socketState.socket.on(
  "chatFromServer",
  (data: {
    audio: Float32Array;
    video?: string;
    sampleRate: number;
    source?: string;
    glitch: boolean;
    bufferSize: number;
    duration: number;
    floating?: boolean;
    position?: { top: number; left: number; width: number; height: number };
    target?: string;
  }) => {
    console.log("chatFromServer");
    audioWorkletState.flag.CHAT = true;

    // if (quantizeState.flag && quantizeState.stream.includes("CHAT")) {
    //   const chunk = {
    //     source: "CHAT",
    //     audio: data.audio,
    //     video: data.video,
    //     sampleRate: data.sampleRate,
    //     glitch: data.glitch,
    //     bufferSize: data.bufferSize,
    //     duration: data.duration,
    //   };
    //   // data.source = "CHAT";
    //   streamChunk.CHAT = chunk;
    // } else {
    //   if (data.floating === undefined || !data.floating) {
    //     streamPlay("CHAT", socketState.socket, data);
    //   } else {
    //     // const position = positionFloatingImage(data.target);
    //     showImage(data.video, data.position);
    //   }
    // }
  }
);

socketState.socket.on(
  "audiobufferFromServer",
  (data: { buffer: ArrayBuffer; type: string }) => {
    console.log("audiobufferFromServer");
    console.log(data);
    // data.bufferをfloat32Arrayに変換
    const float32Array = new Float32Array(data.buffer);
    const streamData = {
      audio: float32Array,
      sampleRate: 44100,
      glitch: false,
      bufferSize: 8192,
    };
    const streamType = data.type === "CHAT" ? "CHAT" : "STREAM";
    streamPlay(streamType, socketState.socket, streamData);
    audioWorkletState.flag[data.type] = true;
  }
);

// CHAT以外のSTREAM向け
socketState.socket.on(
  "streamFromServer",
  (data: {
    source: string;
    audio: Float32Array;
    video?: string;
    sampleRate: number;
    glitch: boolean;
    bufferSize: number;
    duration?: number;
    floating?: boolean;
    position?: { top: number; left: number; width: number; height: number };
    target?: string;
    filter?: filterStateType;
  }) => {
    streamFlagState[data.source] = true;
    if (quantizeState.flag && quantizeState.stream.includes(data.source)) {
      streamChunk[data.source] = data;
    } else {
      if (data.floating === undefined || !data.floating) {
        streamPlay("STREAM", socketState.socket, data, cinemaFlag);
      } else {
        showImage(data.video, data.position);
      }
    }
  }
);

socketState.socket.on(
  "voiceFromServer",
  (data: { text: string; lang: string }) => {
    console.log("debug");
    const uttr = new SpeechSynthesisUtterance();
    uttr.lang = data.lang;
    uttr.text = data.text;
    // 英語に対応しているvoiceを設定
    speechSynthesis.onvoiceschanged = () => {
      const voices = speechSynthesis.getVoices();
      for (let i = 0; i < voices.length; i++) {
        console.log(voices[i]);
        if (voices[i].lang === "en-US") {
          console.log("hit");
          console.log(voices[i]);
          uttr.voice = voices[i];
        }
      }
    };

    speechSynthesis.speak(uttr);
    // voiceState.lang = data.lang;
    // voiceState.speechSynthesis.text = data.text;
    // voiceState.speechSynthesis.lang = data.lang;
    // if (voiceState.flag && voiceState.speechSynthesis.text.length > 0) {
    //   speechVoice(voiceState.speechSynthesis);
    // }
  }
);

socketState.socket.on("gainFromServer", (data) => {
  gainChange(data);
});

socketState.socket.on("windowReqFromServer", (data: newWindowReqType) => {
  window.open(
    data.URL,
    "_blank",
    "width=" +
      String(data.width) +
      ",height=" +
      String(data.height) +
      ",top=" +
      String(data.top) +
      ",left=" +
      String(data.left)
  );
  click(1.0);
});

socketState.socket.on("quantizeFromServer", (data: bpmStreamStateType) => {
  quantizeFromServer(data);
});

socketState.socket.on(
  "clockFromServer",
  (data: { clock: boolean; barLatency: number }) => {
    if (data.clock) {
      clockBase = Date.now();
      clockModeId = enableClockMode(data.barLatency);
    } else {
      clockBase = 0;
      clockModeId = disableClockMode(clockModeId);
    }
  }
);

socketState.socket.on(
  "emojiFromServer",
  (data: { state: boolean; text: string }) => {
    textPrint(data.text);
    setTimeout(() => {
      erasePrint();
    }, 500);
    emojiState(data.state);
  }
);

socketState.socket.on("bpmFromServer", (data: { bpm: number; bar: number }) => {
  console.log("bpmFromServer", data);
  metronomeState.fournote = data.bar / 4;
  // quantizeState.bar = data.bar;
  if (quantizeState.flag) {
    // setQuantize({
    //   flag: true,
    //   bar: data.bar,
    //   stream: quantizeState.stream,
    //   beat: quantizeState.beat,
    // });
  }
});

socketState.socket.on("timelapseFromServer", (data) => {
  console.log("timelapseFromServer", data);
  if (data.cmd === "FALSE") {
    timelapseState.flag = false;
  } else if (data.cmd === "GET") {
    timelapseState.trriger = true;
    if (!timelapseState.flag) {
      timelapseState.flag = true;
      setTimeout(() => {
        timelapseState.flag = false;
      }, 5000);
    }
  }
});

socketState.socket.on("gpsFlagFromServer", () => {
  if (isMobile) {
    if (!flagState.gpsFlag) {
      flagState.gpsFlag = true;
    } else {
      flagState.gpsFlag = false;
    }
  } else {
    textPrint("This device is not mobile");
  }
});

socketState.socket.on("accelarateFlagFromServer", () => {
  if (isMobile) {
    if (!flagState.accelarateFlag) {
      flagState.accelarateFlag = true;
    } else {
      flagState.accelarateFlag = false;
    }
  } else {
    textPrint("This device is not mobile");
  }
});

/*
socketState.socket.on("clockModeFromServer", (data: { clockMode: boolean }) => {
  console.log(data);
  if (data.clockMode) {
    if (clockModeId === 0) {
      clockModeId = enableClockMode();
    }
  } else {
    if (clockModeId !== 0) {
      clockModeId = disableClockMode(clockModeId);
    }
  }
});
*/
const videoPlayer = <HTMLVideoElement>document.getElementById("video2");
socketState.socket.on("bufferFromServer", (data) => {
  const uint8Array = new Uint8Array(data);
  const blob = new Blob([uint8Array]);
  const url = URL.createObjectURL(blob);
  // videoElement.src = url;
  videoPlayer.src = url;
  textPrint("buffer");
});

// disconnect時、1秒後再接続
socketState.socket.on("disconnect", () => {
  console.log("disconnect");
  setTimeout(() => {
    socketState.socket.connect();
  }, 1000);
});

export const initialize = async () => {
  erasePrint();

  await initVideo();
  await initAudio();

  const SUPPORTS_MEDIA_DEVICES = "mediaDevices" in navigator;
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
    await console.log(stream);
    await textPrint("initialized");
    await socketState.socket.emit("connectFromClient", {
      clientMode:
        window.location.pathname.includes("noStream") ||
        window.location.pathname.includes("nostream")
          ? "noStream"
          : "client",
      urlPathName: window.location.pathname,
      width: window.innerWidth,
      height: window.innerHeight,
      isMobile: isMobile,
    });

    if (isMobile) {
      sensorTimeIntervalId = window.setInterval(() => {
        getAcceleration()
          .then((acceleration) => {
            accelerationData.x = acceleration.x;
            accelerationData.y = acceleration.y;
            accelerationData.z = acceleration.z;
            accelerationData.timestamp = acceleration.timestamp;
          })
          .catch((error) => {
            console.error("加速度センサーの取得に失敗:", error);
          });
        if (flagState.gpsFlag) {
          getGPSPosition()
            .then((position) => {
              gpsPosition.latitude = position.latitude;
              gpsPosition.longitude = position.longitude;
            })
            .catch((error) => {
              console.error("GPS位置情報の取得に失敗:", error);
            });
          const frequency =
            20 +
            440 *
              Math.sqrt(
                Math.pow(gpsPosition.latitude - originlat, 2) +
                  Math.pow(gpsPosition.longitude - originlng, 2)
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
                Math.pow(accelerationData.x, 2) +
                  Math.pow(accelerationData.y, 2) +
                  Math.pow(accelerationData.z, 2)
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

    await initAudioWorklet(stream, socketState.socket);

    await setTimeout(() => {
      erasePrint();
    }, 500);
  } else {
    textPrint("not support navigator.mediaDevices.getUserMedia");
  }

  flagState.start = true;
  // streamFlag.timelapse = true;
  timelapseState.flag = true;
  timelapseState.trriger = false;
  timelapseState.setIntervalId = window.setInterval(() => {
    if (timelapseState.flag) {
      timelapseState.trriger = true;
    }
  }, 60000);

  /*
  quantize(100)

setTimeout(() => {
  stopQuantize()
},5000)

  */
};
textPrint("click screen");

//debugOn
