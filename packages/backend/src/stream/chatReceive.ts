import SocketIO from "socket.io";
import { cmdStateType, buffStateType } from "../types/global";
import { streams, states, basisBufferSize } from "../states";
import { glitchStream } from "./glitchStream";
import { pushStateStream } from "../upload";
import { pickupTarget } from "../route";
import { pickupStreamTarget } from "./pickupStreamTarget";

export const chatReceive = (
  buffer: buffStateType,
  io: SocketIO.Server,
  from: string
) => {
  switch (buffer.source) {
    case "CHAT":
      streams.CHAT.push(buffer);
      if (states.current.stream.CHAT) {
        const chunk = {
          sampleRate: states.stream.sampleRate.CHAT,
          glitch: states.stream.glitch.CHAT,
          ...streams.CHAT.shift(),
        };
        if (states.stream.randomrate.CHAT) {
          if (states.stream.randomratenote.CHAT) {
            chunk.sampleRate = 11025 + Math.floor(Math.random() * 10) * 11025;
          } else {
            chunk.sampleRate =
              states.stream.randomraterange.CHAT.min +
              Math.floor(
                Math.random() *
                  (states.stream.randomraterange.CHAT.max -
                    states.stream.randomraterange.CHAT.min)
              );
          }
          //          console.log(chunk.sampleRate)
        }
        if (states.stream.glitch[buffer.source] && chunk.video) {
          chunk.video = glitchStream(chunk.video);
        }
        console.log(states.client);
        console.log(io.sockets.adapter.rooms);
        const targetId = pickupStreamTarget(states, buffer.source, from);
        // const targetId =
        //   states.client[Math.floor(Math.random() * states.client.length)];
        console.log("chatReceive targetId: ", targetId);
        if (!states.stream.grid[buffer.source]) {
          io.to(targetId).emit("chatFromServer", chunk);
        } else {
          const timeOutVal =
            (Math.round(Math.random() * 16) * states.stream.latency.CHAT) / 4;
          setTimeout(() => {
            io.to(targetId).emit("chatFromServer", chunk);
          }, timeOutVal);
        }
      } else {
        io.emit("erasePrintFromServer");
      }
      break;
    case "PLAYBACK": //RECORDコマンドからのチャンク受信
      streams.PLAYBACK.push(buffer);
      console.log("PLAYBACK.length:" + String(streams.PLAYBACK.length));
      break;
    case "TIMELAPSE":
      streams.TIMELAPSE.audio.push(buffer.audio);
      streams.TIMELAPSE.video.push(buffer.video);
      // console.log(buffer.audio)
      console.log("TIMELAPSE.length:" + String(streams.TIMELAPSE.audio.length));
      break;
    /*
    case "SHOT":
      if (streams["SHOT"] === undefined || streams["SHOT"] === null) {
        streams["SHOT"] = { audio: [], video: [], bufferSize: basisBufferSize };
      }

      streams["SHOT"].audio.push(buffer.audio);
      streams["SHOT"].video.push(buffer.video);
      console.log("SHOT.length:" + String(streams["SHOT"].audio.length));
      break;
      */
    default:
      // 存在しないターゲットの場合は、新規作成
      if (
        streams[buffer.source] === undefined ||
        streams[buffer.source] === null
      ) {
        streams[buffer.source] = {
          audio: [],
          video: [],
          bufferSize: basisBufferSize,
        };
      }
      streams[buffer.source].audio.push(buffer.audio);
      streams[buffer.source].video.push(buffer.video);
      pushStateStream(buffer.source, states);
  }
};
