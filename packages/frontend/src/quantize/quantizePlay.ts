import { quantizeState, streamFlagState } from "../state";
import { playAudioStream } from "../stream";
import { showImage, erasePrint, textPrint } from "../canvasEvent";
import { chatReq } from "../stream";
import { socketState } from "../state/socketState";

export const quantizePlay = (
  data: {
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
  },
  beat?: number,
) => {
  const streamBeat = quantizeState.stream[data.source]?.beat;
  const rawBeat = beat !== undefined ? beat : streamBeat ?? 1;
  const resolvedBeat =
    rawBeat === 0 ? Math.pow(2, Math.floor(Math.random() * 6)) : rawBeat;
  const playCount = resolvedBeat > 0 ? resolvedBeat : 1;

  for (let i = 0; i < playCount; i++) {
    setTimeout(() => {
      if (streamFlagState[data.source]) {
        playAudioStream(
          data.audio,
          data.sampleRate,
          data.glitch,
          data.bufferSize,
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
    }, (quantizeState.bar / playCount) * i);
  }

  if (data.source === "CHAT") {
    chatReq(String(socketState.socketId));
  } else {
    socketState.socket.emit("streamReqFromClient", data.source);
  }
};
