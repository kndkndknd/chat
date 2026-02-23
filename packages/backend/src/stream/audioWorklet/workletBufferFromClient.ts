import { Server } from "socket.io";
import { streams } from "../../data/chunk/streams";
import { pickupStreamTarget } from "../pickupStreamTarget";
import { chatReceive } from "../chatReceive";
import { buffStateType } from "../../../../../types";
import { pushStateStream } from "../pushStateStream";

export const workletBufferFromClient = (
  data: {
    video: string;
    audio: ArrayBuffer;
    source: string;
    bufferSize: number;
  },
  io: Server,
) => {
  if (data.source === "CHAT") {
    const buff: buffStateType = {
      source: data.source,
      video: data.video,
      audio: data.audio,
      bufferSize: data.audio.byteLength,
      duration: data.audio.byteLength / 44100 / 4, // 4はFloat32Arrayのバイト数
    };
    chatReceive(io, buff);
    // const target = pickupStreamTarget(data.source);
    // io.to(target).emit("chatFromServer", {
    //   video: data.video,
    //   audio: data.audio,
    //   source: data.source,
    // });
  } else if (data.source === "TIMELAPSE") {
    streams.TIMELAPSE.audio.push(data.audio);
    streams.TIMELAPSE.video.push(data.video);
    streams.TIMELAPSE.index++;
    console.log("TIMELAPSE length: " + streams.TIMELAPSE.index);
  } else if (data.source === "PLAYBACK") {
    streams.PLAYBACK.audio.push(data.audio);
    streams.PLAYBACK.video.push(data.video);
    streams.PLAYBACK.index++;
    console.log("RECORD length: " + streams.PLAYBACK.index);
  } else {
    if (streams[data.source] === undefined) {
      streams[data.source] = {
        audio: [],
        video: [],
        index: 0,
        bufferSize: data.bufferSize,
      };
      pushStateStream(data.source);
    }
    streams[data.source].audio.push(data.audio);
    streams[data.source].video.push(data.video);
    streams[data.source].index++;
    console.log(
      `RECORD AS ${data.source} length: ${streams[data.source].index}`,
    );
  }
};
