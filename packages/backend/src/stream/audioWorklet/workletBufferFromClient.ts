import { streamsRedis } from "../../data/chunk/streams";
import { chatReceive } from "../chatReceive";
import { buffStateType } from "../../../../../types";
import { pushStateStream } from "../pushStateStream";
import { streamState } from "../../state";

export const workletBufferFromClient = async (
  data: {
    video: string;
    audio: ArrayBuffer;
    source: string;
    bufferSize: number;
  },
) => {
  if (data.source === "CHAT") {
    const buff: buffStateType = {
      source: data.source,
      video: data.video,
      audio: data.audio,
      bufferSize: data.audio.byteLength,
      duration: data.audio.byteLength / 44100 / 4,
    };
    chatReceive(buff);
  } else if (data.source === "TIMELAPSE") {
    const bufferSize = data.bufferSize || streamState.basisBufferSize;
    await streamsRedis.push("TIMELAPSE", {
      source: "TIMELAPSE",
      audio: data.audio,
      video: data.video,
      bufferSize,
      duration: bufferSize / 44100,
    });
    const idx = await streamsRedis.incrementIndex("TIMELAPSE");
    console.log("TIMELAPSE length: " + idx);
  } else if (data.source === "PLAYBACK") {
    const bufferSize = data.bufferSize || streamState.basisBufferSize;
    await streamsRedis.push("PLAYBACK", {
      source: "PLAYBACK",
      audio: data.audio,
      video: data.video,
      bufferSize,
      duration: bufferSize / 44100,
    });
    const idx = await streamsRedis.incrementIndex("PLAYBACK");
    console.log("RECORD length: " + idx);
  } else {
    if (!(await streamsRedis.hasKey(data.source))) {
      await streamsRedis.initKey(data.source);
      pushStateStream(data.source);
    }
    const bufferSize = data.bufferSize || streamState.basisBufferSize;
    await streamsRedis.push(data.source, {
      source: data.source,
      audio: data.audio,
      video: data.video,
      bufferSize,
      duration: bufferSize / 44100,
    });
    const idx = await streamsRedis.incrementIndex(data.source);
    console.log(`RECORD AS ${data.source} length: ${idx}`);
  }
};
