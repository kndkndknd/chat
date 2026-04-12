import { streamSocketType } from "../../../../types";
import { streamFlagState, quantizeState } from "../state";
import { streamChunk } from "../state";
import { streamPlay } from "./play/streamPlay";
import { showImage } from "../canvasEvent"
import { postStreamReq } from "../postMessage/postStreamReq";

export const streamMessage = ({type, payload}: streamSocketType) => {
  streamFlagState[payload.source] = true;
  if (quantizeState.flag && quantizeState.stream.includes(payload.source)) {
    streamChunk[payload.source] = payload;
  } else {
    if (payload.floating === undefined || !payload.floating) {
      streamPlay("STREAM", payload);
    } else {
      showImage(payload.video, payload.position);
    }
  }
  postStreamReq(payload.source);
}
