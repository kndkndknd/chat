import SocketIO from "socket.io";
import { cmdStateType, buffStateType } from "../types/global";
import { streams, states, basisBufferSize } from "../states";
import { glitchStream } from "./glitchStream";

export const chatReceive = (buffer: buffStateType, io: SocketIO.Server) => {
  switch (buffer.target) {
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
        if (states.stream.glitch[buffer.target] && chunk.video) {
          chunk.video = glitchStream(chunk.video);
        }
        console.log(states.client);
        const targetId =
          states.client[Math.floor(Math.random() * states.client.length)];
        console.log(targetId);
        if (!states.stream.grid[buffer.target]) {
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
    case "SHOT":
      if (streams["SHOT"] === undefined || streams["SHOT"] === null) {
        streams["SHOT"] = { audio: [], video: [], bufferSize: basisBufferSize };
      }

      streams["SHOT"].audio.push(buffer.audio);
      streams["SHOT"].video.push(buffer.video);
      console.log("SHOT.length:" + String(streams["SHOT"].audio.length));
      break;
  }
};
