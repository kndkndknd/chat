import { streamChunk, socketState, quantizeState } from "../../state";
import { SocketFacade } from "../../socket/SocketFacade";
import { streamPlay } from "../play/streamPlay";
import { showImage } from "../../canvasEvent";
import { streamReq } from "../streamReq";

export const chatFromServer = (
  data: {
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
  },
  socket: SocketFacade
) => {
  // console.log("chatFromServer");
  if (quantizeState.stream.CHAT?.flag) {
    const chunk = {
      source: "CHAT",
      audio: data.audio,
      video: data.video,
      sampleRate: data.sampleRate,
      glitch: data.glitch,
      bufferSize: data.bufferSize,
      duration: 1000 * data.bufferSize / data.sampleRate,
    };
    console.log("chunk:", chunk);
    // data.source = "CHAT";
    streamChunk.CHAT = chunk;
  } else {
    if (data.floating === undefined || !data.floating) {
      streamPlay("CHAT", data);
      streamReq(socket, "CHAT", data, data.source);
    } else {
      // const position = positionFloatingImage(data.target);
      showImage(data.video, data.position);
    }
  }
};
