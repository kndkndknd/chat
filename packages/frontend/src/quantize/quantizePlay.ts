import { quantizeState, streamFlagState } from "../state";
import { playAudioStream } from "../stream";
import { showImage, erasePrint, textPrint } from "../canvasEvent";
import { chatReq } from "../stream";
import { socketState } from "../state/socketState";

export const quantizePlay = (data: {
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
  console.log("quantizePlay", data);
  const beat =
    quantizeState.beat === 0
      ? Math.pow(2, Math.floor(Math.random() * 6))
      : quantizeState.beat;
  for (let i = 0; i <= beat; i++) {
    setTimeout(() => {
      if (streamFlagState[data.source]) {
        playAudioStream(
          data.audio,
          data.sampleRate,
          data.glitch,
          data.bufferSize
        );
        if (data.video) {
          showImage(data.video);
          setTimeout(() => {
            erasePrint();
          }, 300);
        } else if (data.source !== undefined) {
          textPrint(data.source.toLowerCase());
        }
      }
    }, (quantizeState.bar / beat) * i);
  }
  if (data.source === "CHAT") {
    console.log("chatreq");
    chatReq(String(socketState.socketId));
  } else {
    console.log("streamReqFromClient");
    socketState.socket.emit("streamReqFromClient", data.source);
  }
};
