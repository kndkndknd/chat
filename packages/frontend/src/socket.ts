import {
  canvasState,
  flagState,
  metronomeState,
  quantizeState,
  socketState,
  streamChunk,
  streamFlagState,
  streamState,
  timelapseState,
  webRtcState,
  audioWorkletState,
} from "./state";

import {
  bpmStreamStateType,
  filterStateType,
  wholeCmdOption
} from "../../../types";
import { emojiState, erasePrint, textPrint, showImage, flickering } from "./canvasEvent";
import { stopCmd, cmdFromServer } from "./cmd";
import { quantizeFromServer } from "./quantize/quantizeFromServer";
import { chatReq, recordReqFromServer, streamPlay } from "./stream";
import { gainChange } from "./webaudio";
import { wholeCmd } from "./cmd/wholeCmd";
import { startChunkedRecording, stopChunkedRecording } from "./recording";
import { initFaceDetection, stopFaceDetection } from "./faceApi";
import {
  attachMsePlayback,
  appendMediaChunk,
  teardownMsePlayback,
  attachMseAudioPlayback,
  appendAudioChunk,
  teardownMseAudioPlayback,
} from "./webRTC/msePlayback";


export const socket = (): void => {
  socketState.socket.on(
    "stringsFromServer",
    (data: { strings: string; timeout: boolean }) => {
      erasePrint();
      canvasState.stringsClient = data.strings;
      textPrint(canvasState.stringsClient, { timeout: data.timeout });
    },
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
      canvasState.stringsClient = "";
    },
  );

  socketState.socket.on(
    "stopFromServer",
    (data: { fadeOutVal: number; target?: string }) => {
      erasePrint();
      if (data.target === undefined || data.target === "ALL") {
        stopCmd(data.fadeOutVal);
      }
      textPrint("STOP", { timeout: true, timeoutDuration: 800 });
    },
  );

  socketState.socket.on("chatReqFromServer", () => {
    chatReq(String(socketState.socket.id));
    setTimeout(() => {
      erasePrint();
    }, 1000);
  });

  socketState.socket.on(
    "recordReqFromServer",
    (data: { source: string; timeout: number }) => {
      recordReqFromServer(data);
      textPrint("RECORD", { timeout: true, timeoutDuration: data.timeout });
      // setTimeout(() => {
      //   erasePrint();
      // }, data.timeout);
    },
  );

  // CHATのみ向けにする
  socketState.socket.on(
    "chatFromServer",
    (data: { video: string; audio: ArrayBuffer; source: string, bufferSize: number, sampleRate: number, glitch: boolean,duration?: number }) => {
      // (data: {
      //   audio: Float32Array;
      //   video?: string;
      //   sampleRate: number;
      //   source?: string;
      //   glitch: boolean;
      //   bufferSize: number;
      //   duration: number;
      //   floating?: boolean;
      //   position?: { top: number; left: number; width: number; height: number };
      //   target?: string;
      // }) => {
      // console.log("chatFromServer");
      // console.log(data);
      // data.bufferをfloat32Arrayに変換
      const float32Array = new Float32Array(data.audio);
      const streamData = {
        audio: float32Array,
        sampleRate: data.sampleRate,
        glitch: data.glitch,
        bufferSize: data.bufferSize,
        video: data.video,
        source: data.source,
      };
      const streamType = data.source === "CHAT" ? "CHAT" : "STREAM";
      streamPlay(streamType, socketState.socket, streamData);
      // audioWorkletState.chat.flag[data.source] = true;

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
    },
  );
  socketState.socket.on("quantizeFromServer", (data: bpmStreamStateType) => {
    quantizeFromServer(data);
  });

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
      index?: number;
    }) => {
      streamFlagState[data.source] = true;
      if (quantizeState.flag && quantizeState.stream.includes(data.source)) {
        streamChunk[data.source] = data;
      } else {
        if (data.floating === undefined || !data.floating) {
          streamPlay("STREAM", socketState.socket, data /*, cinemaFlag*/);
        } else {
          showImage(data.video, data.position);
        }
      }
    },
  );

  socketState.socket.on(
    "workletBufferFromServer",
    (data: { video: string; audio: ArrayBuffer; source: string }) => {
      console.log("workletBufferFromServer");
      console.log(data);
      // data.bufferをfloat32Arrayに変換
      const float32Array = new Float32Array(data.audio);
      const streamData = {
        audio: float32Array,
        sampleRate: 44100,
        glitch: false,
        bufferSize: 8192,
        video: data.video,
        source: data.source,
      };
      const streamType = data.source === "CHAT" ? "CHAT" : "STREAM";
      streamPlay(streamType, socketState.socket, streamData);
      audioWorkletState.chat.flag[data.source] = true;
    },
  );

  socketState.socket.on("gainFromServer", (data) => {
    gainChange(data);
  });

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
    },
  );

  socketState.socket.on(
    "emojiFromServer",
    (data: { state: boolean; text: string }) => {
      textPrint(data.text, { timeout: true });
      // setTimeout(() => {
      //   erasePrint();
      // }, 500);
      emojiState(data.state);
    },
  );

  socketState.socket.on(
    "bpmFromServer",
    (data: { bpm: number; bar: number }) => {
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
    },
  );

  socketState.socket.on("timelapseFromServer", (data) => {
    console.log("timelapseFromServer", data);
    if (data.cmd === "FALSE") {
      timelapseState.flag = false;
    } else if (data.cmd === "TRUE") {
      timelapseState.flag = true;
    } else if (data.cmd === "GET") {
      // timelapseState.trriger = true;
      audioWorkletState.chat.flag.TIMELAPSE = true;
      if (!timelapseState.flag) {
        timelapseState.flag = true;
        setTimeout(() => {
          timelapseState.flag = false;
        }, 5000);
      }
    }
    textPrint(`TIMELAPSE ${data.cmd}`, { timeout: true });
    // setTimeout(() => {
    //   erasePrint();
    // }, 800);
  });

  socketState.socket.on("gpsFlagFromServer", () => {
    if (flagState.isMobile) {
      if (!flagState.gpsFlag) {
        flagState.gpsFlag = true;
      } else {
        flagState.gpsFlag = false;
      }
    } else {
      textPrint("This device is not mobile", { timeout: false });
    }
  });

  socketState.socket.on("accelarateFlagFromServer", () => {
    if (flagState.isMobile) {
      if (!flagState.accelarateFlag) {
        flagState.accelarateFlag = true;
      } else {
        flagState.accelarateFlag = false;
      }
    } else {
      textPrint("This device is not mobile");
    }
  });

  socketState.socket.on("bufferRecReqFromServer", () => {
    if (streamState.stream) {
      startChunkedRecording(streamState.stream as MediaStream);
    }
  });

  socketState.socket.on("bufferRecStopFromServer", () => {
    stopChunkedRecording();
    // 受信側 MSE もリセット（次回 CALL の init segment を取り直すため）
    teardownMsePlayback();
    teardownMseAudioPlayback();
  });

  // カメラローテーション切替用: MediaRecorder だけ止めて MSE はそのまま。
  // 受信側 (werift recv recorder) は継続しているので、再生は途切れずに続く。
  socketState.socket.on("recorderSwitchStopFromServer", () => {
    stopChunkedRecording();
  });

  // backend の recv pipeline から流れてくる WebM チャンクを MSE で再生
  socketState.socket.on("mediaChunkFromServer", (data: ArrayBuffer) => {
    if (webRtcState.videoPlayer) {
      attachMsePlayback(webRtcState.videoPlayer);
    }
    appendMediaChunk(data);
  });

  socketState.socket.on("audioChunkFromServer", (data: ArrayBuffer) => {
    if (webRtcState.audioPlayer) {
      attachMseAudioPlayback(webRtcState.audioPlayer);
    }
    appendAudioChunk(data);
  });

  // ピア再接続などで recv パイプラインが再起動するとき、新しい init segment を
  // 受け取れるよう MSE を一度作り直す
  socketState.socket.on("mediaResetFromServer", () => {
    teardownMsePlayback();
    teardownMseAudioPlayback();
  });

  socketState.socket.on("bufferFromServer", (data) => {
    const uint8Array = new Uint8Array(data);
    const blob = new Blob([uint8Array]);
    const url = URL.createObjectURL(blob);
    // videoElement.src = url;
    webRtcState.videoPlayer.src = webRtcState.videoPlayer !== null ? url : null;
    textPrint("buffer");
  });

  // whole
  socketState.socket.on("wholeCmdFromServer", (option: wholeCmdOption) => {
    wholeCmd(option);
  })

  // webRtc関連
  // socketState.socket.on("candidateReqFromServer", (peers: string[]) => {
  //   textPrint("room " + peers.join(","));
  //   if (streamState.stream !== null) {
  //     initRtpPeerConnection(
  //       socketState.socket,
  //       streamState.stream as MediaStream,
  //       peers,
  //     );
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

  socketState.socket.on("personDetectFromServer", () => {
    flickering();
  });

  socketState.socket.on(
    "clientSettingsFromServer",
    (data: { facedetection: boolean; hanged: boolean }) => {
      if (data?.facedetection) {
        initFaceDetection().catch((e) =>
          console.error("faceDetection init error:", e),
        );
      } else {
        stopFaceDetection();
      }
    },
  );

  // 切断のみ通知。再接続は SocketFacade が指数バックオフで自動実施する。
  socketState.socket.on("disconnect", () => {
    console.log("disconnect");
  });
};
