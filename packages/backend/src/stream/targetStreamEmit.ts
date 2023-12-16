import SocketIO from "socket.io";
import { cmdStateType, buffStateType } from "../types/global";
import { streams, basisBufferSize } from "../states";
import { notTargetEmit } from "../cmd/notTargetEmit";

export const targetStreamEmit = (
  source: string,
  io: SocketIO.Server,
  state: cmdStateType,
  targetId: string
) => {
  state.stream.target[source].push(targetId);
  state.current.stream[source] = true;
  let buff: buffStateType;
  if (source === "PLAYBACK") {
    if (streams[source].length > 0) {
      if (!state.stream.random[source]) {
        buff = streams[source].shift();
        streams[source].push(buff);
      } else {
        // RANDOM
        buff =
          streams[source][Math.floor(Math.random() * streams[source].length)];
      }
    } else {
      io.emit("stringsFromServer", { strings: "NO BUFFER", timeout: true });
    }
  } else if (source === "EMPTY") {
    let audioBuff = new Float32Array(basisBufferSize);
    for (let i = 0; i < basisBufferSize; i++) {
      audioBuff[i] = 1.0;
    }
    buff = {
      target: source,
      bufferSize: basisBufferSize,
      audio: audioBuff,
      video: streams[source].video.shift(),
      duration: basisBufferSize / 44100,
    };
  } else {
    if (streams[source].audio.length > 0 || streams[source].video.length > 0) {
      if (!state.stream.random[source]) {
        buff = {
          target: source,
          bufferSize: streams[source].bufferSize,
          audio: streams[source].audio.shift(),
          video: streams[source].video.shift(),
          duration: streams[source].bufferSize / 44100,
        };
        streams[source].audio.push(buff.audio);
        streams[source].video.push(buff.video);
      } else {
        buff = {
          target: source,
          bufferSize: streams[source].bufferSize,
          audio:
            streams[source].audio[
              Math.floor(Math.random() * streams[source].audio.length)
            ],
          video:
            streams[source].video[
              Math.floor(Math.random() * streams[source].video.length)
            ],
          duration: streams[source].bufferSize / 44100,
        };
      }
    } else {
      io.emit("stringsFromServer", { strings: "NO BUFFER", timeout: true });
    }
  }
  if (buff) {
    const stream = {
      source: source,
      sampleRate: state.stream.glitch[source]
        ? state.stream.glitchSampleRate
        : state.stream.sampleRate[source], // glicthがtrueならサンプルレートを切替
      glitch: state.stream.glitch[source] ? state.stream.glitch[source] : false,
      ...buff,
    };

    if (state.stream.randomrate[source]) {
      stream.sampleRate = 11025 + Math.floor(Math.random() * 10) * 11025;
    }

    if (!stream.video) console.log("not video");
    if (!state.stream.grid[source]) {
      io.to(targetId).emit("streamFromServer", stream);
    } else {
      const timeOutVal =
        (Math.round(Math.random() * 16) * state.stream.latency[source]) / 4;
      setTimeout(() => {
        io.to(targetId).emit("streamFromServer", stream);
      }, timeOutVal);
    }
  } else {
    console.log("no buffer");
  }
  notTargetEmit(targetId, state.client, io);
};
