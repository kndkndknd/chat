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
import { setGainUI } from "./ui/gainUI";
import { wholeCmd } from "./cmd/wholeCmd";
import { initFaceDetection, stopFaceDetection, blockFaceDetection } from "./faceApi";
import { recordAll, uploadRecording, playRecording } from "./mediaRecorder";


export const socket = (): void => {
  socketState.socket.on(
    "stringsFromServer",
    (data: { strings: string; timeout: boolean }) => {
      // console.log("stringsFromServer", data.strings);
      textPrint(data.strings + "debug", { timeout: data.timeout });
      erasePrint();
      canvasState.stringsClient = data.strings;
      textPrint(canvasState.stringsClient, { timeout: data.timeout });
    },
  );
  socketState.socket.on("erasePrintFromServer", () => {
    // erasePrint(stx, strCnvs)
    erasePrint();
  });

  // // BLACK コマンド: 画面全体を真っ黒にする。解除は文字入力(main.ts keydown)で行う。
  // socketState.socket.on("blackFromServer", () => {
  //   enableBlackMode();
  // });

  // // ナイトモード解除時: BLACK モードをサーバーから明示的に解除する。
  // socketState.socket.on("blackOffFromServer", () => {
  //   disableBlackMode();
  // });

  // // ナイトモード移行時: masterGain と glitchGain を 0 にして消音する。
  // socketState.socket.on("masterMuteFromServer", () => {
  //   muteMasterForNight();
  // });

  // // ナイトモード解除時: masterGain と glitchGain を移行前の値へ戻す。
  // socketState.socket.on("masterUnmuteFromServer", () => {
  //   restoreMasterForNight();
  // });

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
      // console.log("cmdFromServer", cmd);
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
    (data: { source: string; timeout: number, index?: number, textPrint?: boolean }) => {
      console.log("recordReqFromServer debug", data);
      recordReqFromServer(data);
      if(data.textPrint === undefined || data.textPrint) {
        textPrint("RECORD", { timeout: true, timeoutDuration: data.timeout });
      }
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

  socketState.socket.on("mediaRecReqFromServer", async () => {
    await recordAll(streamState.stream as MediaStream, 5000).then((recordings) => {
      console.log(recordings);
      recordings.forEach(async (recording) => {
        await uploadRecording(recording, socketState.socket).then((result) => {
          console.log(result);
        });
      });
    });
  });

  socketState.socket.on(
    "mediaRecFromServer",
    (data: { container: string; mimeType: string; blob: ArrayBuffer }) => {
      console.log(`mediaRecFromServer: container=${data.container} mimeType=${data.mimeType} size=${data.blob?.byteLength ?? 0}`);
      playRecording(data);
    },
  );
    

  // gainFromClient(スライダー操作)/ gainReqFromClient(UI を開く)への応答。
  // 実際の音量(GainNode)には適用せず、入力欄の表示のみ更新する。
  // スライダー操作時の発音は gainUI 側のローカル audition が担う。
  socketState.socket.on("gainFromServer", (data) => {
    setGainUI(data);
  });

  socketState.socket.on(
    "voiceFromServer",
    (data: { text: string; lang: string }) => {

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

  // WebRTC 通話は /webrtc 端末のブラウザ (SyncClient) が chat_sync と直接やり取りする。
  // 旧構成の MediaRecorder 中継 (bufferRecReqFromServer 等) / MSE 受信
  // (mediaChunkFromServer 等) はバックエンド werift の撤去に伴い廃止した。

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

  // faceDetectScenario 実行中〜終了後の一定時間、顔認識をブロックする。
  socketState.socket.on(
    "faceDetectBlockFromServer",
    (data: { durationMs: number }) => {
      blockFaceDetection(data.durationMs);
    },
  );

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
