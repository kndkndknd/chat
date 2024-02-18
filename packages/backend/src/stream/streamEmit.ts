import SocketIO from "socket.io";
import { cmdStateType, buffStateType } from "../types/global.js";
import { streams, states, basisBufferSize } from "../states.js";
import { pickupStreamTarget } from "./pickupStreamTarget.js";

export const streamEmit = (
  source: string,
  io: SocketIO.Server,
  state: cmdStateType,
  from?: string
) => {
  // if(streams[source].length > 0) {
  state.current.stream[source] = true;
  console.log(state.client);
  console.log(source);
  const targetId =
    from === undefined
      ? pickupStreamTarget(state, source)
      : pickupStreamTarget(state, source, from);
  // const targetId =
  //   state.client[Math.floor(Math.random() * state.client.length)];
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
      source: source,
      bufferSize: basisBufferSize,
      audio: audioBuff,
      video: streams[source].video.shift(),
      duration: basisBufferSize / 44100,
    };
    /*
    } else if(source === 'TIMELAPSE') {
      if(streams.TIMELAPSE.audio.length > 0 && streams.TIMELAPSE.video.length > 0) {
        buff = {
          target: source,
          bufferSize: streams[source].bufferSize,
          audio: streams[source].audio.shift(),
          video: streams[source].video.shift(),
          duration: streams[source].bufferSize / 44100
        }
      }
      */
  } else {
    console.log(streams[source]);
    if (streams[source].audio.length > 0 || streams[source].video.length > 0) {
      if (!state.stream.random[source]) {
        buff = {
          source: source,
          bufferSize: streams[source].bufferSize,
          audio: streams[source].audio.shift(),
          video: streams[source].video.shift(),
          duration: streams[source].bufferSize / 44100,
        };
        streams[source].audio.push(buff.audio);
        streams[source].video.push(buff.video);
      } else {
        buff = {
          source: source,
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
        (Math.round(Math.random() * 16) * states.stream.latency[source]) / 4;
      setTimeout(() => {
        io.to(targetId).emit("streamFromServer", stream);
      }, timeOutVal);
    }
  } else {
    console.log("no buffer");
  }
  /*
  } else {
    io.emit('stringsFromServer',{strings: "NO BUFFER", timeout: true})
  }
  */
};
