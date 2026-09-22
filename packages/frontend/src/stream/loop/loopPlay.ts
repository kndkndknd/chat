import { loopChunk, streamState } from "../../state";
import { streamPlay } from "../play/streamPlay";

export const hasLoop = (): boolean =>
  Object.values(streamState.loop).some((targets) => targets.length > 0);

export const loopPlay = (): void => {
  Object.keys(streamState.loop).forEach((stream) => {
    if (streamState.loop[stream].length === 0) {
      return;
    }
    const chunk = loopChunk[stream];
    if (!chunk) {
      return;
    }
    streamPlay(stream === "CHAT" ? "CHAT" : "STREAM", chunk);
  });
};
