import { Server } from "socket.io";
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
    await streamsRedis.pushAudio("TIMELAPSE", data.audio);
    await streamsRedis.pushVideo("TIMELAPSE", data.video);
    const idx = await streamsRedis.incrementIndex("TIMELAPSE");
    console.log("TIMELAPSE length: " + idx);
  } else if (data.source === "PLAYBACK") {
    await streamsRedis.pushAudio("PLAYBACK", data.audio);
    await streamsRedis.pushVideo("PLAYBACK", data.video);
    const idx = await streamsRedis.incrementIndex("PLAYBACK");
    console.log("RECORD length: " + idx);
  } else {
    if (!(await streamsRedis.hasKey(data.source))) {
      await streamsRedis.initKey(data.source, data.bufferSize || streamState.basisBufferSize);
      pushStateStream(data.source);
    }
    await streamsRedis.pushAudio(data.source, data.audio);
    await streamsRedis.pushVideo(data.source, data.video);
    const idx = await streamsRedis.incrementIndex(data.source);
    console.log(`RECORD AS ${data.source} length: ${idx}`);
  }
};
