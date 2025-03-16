import { io, Socket } from "socket.io-client";
const socket: Socket = io();
import {
  initVideo,
  initVideoStream,
  canvasSizing,
  textPrint,
  erasePrint,
  showImage,
  emojiState,
  // positionFloatingImage,
} from "./imageEvent";

import {
  initAudio,
  initAudioStream,
  sinewave,
  whitenoise,
  feedback,
  bass,
  click,
  chatReq,
  playAudioStream,
  stopCmd,
  recordReq,
  simulate,
  metronome,
  gainChange,
  quantize,
  stopQuantize,
  initQuantizePlay,
  streamPlay,
  quantizePlay,
} from "./webaudio";

import { cmdFromServer } from "./cmd";

import { cnvs, ctx, videoElement, frontState } from "./globalVariable";

//import {debugOn} from './socket'

import { keyDown } from "./textInput";

import { newWindowReqType } from "./types/global";
import { enableClockMode, disableClockMode } from "./clockMode";
import { hlsVideoPlay, hlsSizing } from "./hlsVideo";

// let start = false;

let darkFlag = false;
let cinemaFlag = false;
let clockModeId: number = 0;
const clientMode = "client";

let clockBase = 0;

// let videoElement = <HTMLVideoElement>document.getElementById('video');
let timelapseId: number;

let stringsClient = "";

let eListener = <HTMLElement>document.getElementById("wrapper");
eListener.addEventListener(
  "click",
  () => {
    if (!frontState.start) {
      initialize();
    }
  },
  false
);

window.addEventListener("resize", (e) => {
  console.log("resizing");
  canvasSizing(socket);
  hlsSizing();
});
canvasSizing();
hlsSizing();

document.addEventListener("keydown", (e) => {
  console.log(e);
  if (e.key === "Enter" && !frontState.start) {
    initialize();
  } else {
    stringsClient = keyDown(e, stringsClient, socket, ctx, cnvs);
  }
});

socket.on(
  "stringsFromServer",
  (data: { strings: string; timeout: boolean }) => {
    // erasePrint(stx, strCnvs);
    erasePrint(ctx, cnvs);
    console.log("stringsFromServer", data);
    stringsClient = data.strings;
    textPrint(stringsClient, ctx, cnvs);
    if (data.timeout) {
      setTimeout(() => {
        erasePrint(ctx, cnvs);
      }, 500);
    }
    if (cinemaFlag) {
      setTimeout(() => {
        erasePrint(ctx, cnvs);
      }, 500);
    }
  }
);
socket.on("erasePrintFromServer", () => {
  // erasePrint(stx, strCnvs)
  erasePrint(ctx, cnvs);
});

socket.on(
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
    cmdFromServer(cmd, ctx, cnvs);
    stringsClient = "";
  }
);

socket.on("stopFromServer", (data: { fadeOutVal: number; target?: string }) => {
  erasePrint(ctx, cnvs);
  if (data.target === undefined || data.target === "ALL") {
    stopCmd(data.fadeOutVal);
  } else if (data.target === "ExceptHls") {
    stopCmd(data.fadeOutVal, "HLS");
  }
  // erasePrint(stx, strCnvs)
  textPrint("STOP", ctx, cnvs);
  setTimeout(() => {
    erasePrint(ctx, cnvs);
  }, 800);
});

socket.on("textFromServer", (data: { text: string }) => {
  erasePrint(ctx, cnvs);
  textPrint(data.text, ctx, cnvs);
  if (cinemaFlag) {
    setTimeout(() => {
      erasePrint(ctx, cnvs);
    }, 500);
  }
});

socket.on("chatReqFromServer", () => {
  chatReq(String(socket.id));
  // textPrint("chatrequest", ctx, cnvs);
  frontState.streamFlag.CHAT = true;
  setTimeout(() => {
    erasePrint(ctx, cnvs);
  }, 1000);
});

socket.on(
  "recordReqFromServer",
  (data: { source: string; timeout: number }) => {
    recordReq(data);
    textPrint("RECORD", ctx, cnvs);
    setTimeout(() => {
      erasePrint(ctx, cnvs);
    }, data.timeout);
  }
);

// CHATのみ向けにする
socket.on(
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
    if (
      frontState.quantize.flag &&
      (frontState.quantize.stream === "all" ||
        frontState.quantize.stream === "CHAT")
    ) {
      const chunk = {
        source: "CHAT",
        audio: data.audio,
        video: data.video,
        sampleRate: data.sampleRate,
        glitch: data.glitch,
        bufferSize: data.bufferSize,
        duration: data.duration,
      };
      // data.source = "CHAT";
      frontState.streamChunk.CHAT = chunk;
      // initQuantizePlay(chunk, socket.id);
    } else {
      if (data.floating === undefined || !data.floating) {
        streamPlay("CHAT", socket.id, data);
      } else {
        // const position = positionFloatingImage(data.target);
        showImage(data.video, ctx, data.position);
      }
    }
  }
);

// CHAT以外のSTREAM向け
socket.on(
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
  }) => {
    frontState.streamFlag[data.source] = true;
    if (
      frontState.quantize.flag &&
      (frontState.quantize.stream === "all" ||
        frontState.quantize.stream === data.source)
    ) {
      frontState.streamChunk[data.source] = data;
      initQuantizePlay(data, socket.id);
    } else {
      if (data.floating === undefined || !data.floating) {
        streamPlay("STREAM", socket.id, data, cinemaFlag);
      } else {
        showImage(data.video, ctx, data.position);
      }
    }
  }
);

socket.on("voiceFromServer", (data: { text: string; lang: string }) => {
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
        // console.log("hit");
        console.log(voices[i]);
        uttr.voice = voices[i];
        // break;
      }
    }
  };
  console.log(uttr);
  speechSynthesis.speak(uttr);
});

socket.on("gainFromServer", (data) => {
  gainChange(data);
});

socket.on("windowReqFromServer", (data: newWindowReqType) => {
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

socket.on(
  "quantizeFromServer",
  (data: {
    flag: boolean;
    stream: string;
    bpm: number;
    bar: number;
    beat: number;
  }) => {
    if (data.flag) {
      console.log(data);
      frontState.quantize.flag = true;
      frontState.quantize.bar = data.bar;
      frontState.quantize.beat =
        data.beat !== undefined ? data.beat : frontState.quantize.beat;
      frontState.quantize.stream =
        data.stream !== undefined ? data.stream : frontState.quantize.stream;
      if (
        frontState.streamFlag[data.stream] &&
        frontState.streamChunk[data.stream] !== undefined &&
        frontState.streamChunk[data.stream].autdio !== undefined
      ) {
        quantizePlay(
          {
            source: data.stream,
            video:
              frontState.streamChunk[data.stream].video === undefined
                ? ""
                : frontState.streamChunk[data.stream].video,
            audio: frontState.streamChunk[data.stream].audio,
            sampleRate: frontState.streamChunk[data.stream].sampleRate,
            glitch: frontState.streamChunk[data.stream].glitch,
            bufferSize: frontState.streamChunk[data.stream].bufferSize,
          },
          socket.id
        );
      } else if (data.stream === "all") {
        for (let key in frontState.streamFlag) {
          if (
            frontState.streamFlag[key] &&
            frontState.streamChunk[key] !== undefined &&
            frontState.streamChunk[key].autdio !== undefined
          ) {
            quantizePlay(
              {
                source: key,
                video:
                  frontState.streamChunk[key].video === undefined
                    ? ""
                    : frontState.streamChunk[key].video,
                audio: frontState.streamChunk[key].audio,
                sampleRate: frontState.streamChunk[key].sampleRate,
                glitch: frontState.streamChunk[key].glitch,
                bufferSize: frontState.streamChunk[key].bufferSize,
              },
              socket.id
            );
          }
        }
      }
      quantize(data.bar, data.beat, data.stream);
      textPrint(
        `QUANTIZE(BPM:${String(data.bpm)},Beat:${String(data.beat)})`,
        ctx,
        cnvs
      );
      setTimeout(() => {
        erasePrint(ctx, cnvs);
      }, 800);
    } else {
      stopQuantize();
      textPrint("QUANTIZE:false", ctx, cnvs);
      setTimeout(() => {
        erasePrint(ctx, cnvs);
      }, 800);
    }
  }
);

socket.on("clockFromServer", (data: { clock: boolean; barLatency: number }) => {
  if (data.clock) {
    clockBase = Date.now();
    clockModeId = enableClockMode(data.barLatency);
  } else {
    clockBase = 0;
    clockModeId = disableClockMode(clockModeId);
  }
});

socket.on("emojiFromServer", (data: { state: boolean; text: string }) => {
  textPrint(data.text, ctx, cnvs);
  setTimeout(() => {
    erasePrint(ctx, cnvs);
  }, 500);
  emojiState(data.state);
});

socket.on("bpmFromServer", (data: { bpm: number; bar: number }) => {
  console.log("bpmFromServer", data);
  frontState.metronome.fournote = data.bar / 4;
  frontState.quantize.bar = data.bar;
  if (frontState.quantize.flag) {
    stopQuantize();
    quantize(data.bar, frontState.quantize.beat);
  }
});

/*
socket.on("clockModeFromServer", (data: { clockMode: boolean }) => {
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
socket.on("bufferFromServer", (data) => {
  const uint8Array = new Uint8Array(data);
  const blob = new Blob([uint8Array]);
  const url = URL.createObjectURL(blob);
  // videoElement.src = url;
  videoPlayer.src = url;
  textPrint("buffer", ctx, cnvs);
});

// disconnect時、1秒後再接続
socket.on("disconnect", () => {
  console.log("disconnect");
  setTimeout(() => {
    socket.connect();
  }, 1000);
});

export const initialize = async () => {
  erasePrint(ctx, cnvs);

  await initVideo(videoElement);
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
    await initVideoStream(stream, videoElement);
    await console.log(stream);
    await textPrint("initialized", ctx, cnvs);
    await socket.emit("connectFromClient", {
      clientMode:
        window.location.pathname.includes("noStream") ||
        window.location.pathname.includes("nostream")
          ? "noStream"
          : "client",
      urlPathName: window.location.pathname,
      width: window.innerWidth,
      height: window.innerHeight,
    });
    await setTimeout(() => {
      erasePrint(ctx, cnvs);
    }, 500);
  } else {
    textPrint("not support navigator.mediaDevices.getUserMedia", ctx, cnvs);
  }

  frontState.start = true;
  // streamFlag.timelapse = true;
  frontState.timelapse = false;
  timelapseId = window.setInterval(() => {
    frontState.timelapse = true;
  }, 60000);

  /*
  quantize(100)

setTimeout(() => {
  stopQuantize()
},5000)

  */
};
textPrint("click screen", ctx, cnvs);

//debugOn
