import SocketIO from "socket.io";
import { buffStateType } from "../../../../types";
import {
  currentState,
  streamState,
  glitchState,
  sampleRateState,
  clientState,
  bpmState,
} from "../state";
import { streams } from "../data";
import { pickupStreamTarget } from "./pickupStreamTarget";
import { glitchStream } from "./glitchStream";
import { gridTimeoutVal } from "./gridTimeoutVal";

export const streamEmit = async (
  source: string,
  io: SocketIO.Server,
  from?: string,
) => {
  // if(streams[source].length > 0) {
  currentState.stream[source] = true;
  // console.log(state.client);
  // console.log(source);
  console.log(`debug ${source} targetArr`, streamState.target[source]);
  const targetId =
    from === undefined
      ? pickupStreamTarget(source)
      : pickupStreamTarget(source, from);
  // const targetId =
  //   state.client[Math.floor(Math.random() * state.client.length)];
  let buff: buffStateType;
  if (source === "EMPTY") {
    let audioBuff = new Float32Array(streamState.basisBufferSize);
    for (let i = 0; i < streamState.basisBufferSize; i++) {
      audioBuff[i] = 1.0;
    }
    // audioBuff = audioBuff.buffer as ArrayBuffer;
    buff = {
      source: source,
      bufferSize: streamState.basisBufferSize,
      audio: audioBuff.buffer,
      video: streams[source].video.shift(),
      duration: streamState.basisBufferSize / 44100,
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
    // console.log(streams[source]);
    console.log("audio length:", streams[source].audio.length);
    console.log("video length:", streams[source].audio.length);
    if (streams[source].audio.length > 0 || streams[source].video.length > 0) {
      if (!streamState.random[source]) {
        buff = {
          source: source,
          bufferSize: streams[source].bufferSize,
          audio:
            streams[source].audio.length > streams[source].index
              ? streams[source].audio[streams[source].index]
              : new Float32Array(streams[source].bufferSize).buffer,
          video:
            streams[source].video.length > streams[source].index
              ? streams[source].video[streams[source].index]
              : "",
          duration: streams[source].bufferSize / 44100,
        };
        if (
          ((streams[source].video === undefined ||
            streams[source].video.length === 0) &&
            streams[source].index < streams[source].audio.length - 1) ||
          (streams[source].index < streams[source].audio.length - 1 &&
            streams[source].index < streams[source].video.length - 1)
        ) {
          streams[source].index++;
        } else {
          streams[source].index = 0;
        }
        // streams[source].index =
        //   streams[source].index >= streams[source].audio.length - 1
        //     ? streams[source].index + 1
        //     : 0;
        console.log("index:", streams[source].index);
        // streams[source].audio.push(buff.audio);
        // streams[source].video.push(buff.video);
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
      // sampleRate: glitchState.glitch[source]
      //   ? glitchState.glitchSampleRate[source]
      //   : sampleRateState.sampleRate[source], // glicthがtrueならサンプルレートを切替
      sampleRate: sampleRateState.sampleRate[source], // glicthがtrueならサンプルレートを切替
      glitch: glitchState.glitch[source] ? glitchState.glitch[source] : false,
      filter: streamState.filter[source],
      ...buff,
    };
    if (glitchState.glitch[source] && stream.video.length > 0) {
      stream.video = await glitchStream(stream.video);
    }

    if (sampleRateState.randomrate[source]) {
      stream.sampleRate =
        sampleRateState.randomraterange[source].min +
        Math.floor(
          Math.random() *
            (sampleRateState.randomraterange[source].max -
              sampleRateState.randomraterange[source].min),
        );

      // stream.sampleRate = sampleRateRandomize(source);
      // console.log("samplerate", stream.sampleRate);
    }
    // console.log("stream", stream);
    console.log("sampleRateState", sampleRateState);
    if (!stream.video) console.log("not video");
    // if (!streamState.grid[source]) {
    console.log(
      "bpmState, gridFlag:",
      bpmState[targetId].stream[source].gridFlag,
    );
    if (!bpmState[targetId].stream[source].gridFlag) {
      // io.to(targetId).emit("streamFromServer", stream);
      ioEmitStreamFromServer(io, stream, targetId, source);
    } else {
      const timeOutVal = gridTimeoutVal(source, targetId);
      setTimeout(() => {
        if (currentState.stream[source]) {
          ioEmitStreamFromServer(io, stream, targetId, source);
        }
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

const ioEmitStreamFromServer = async (io, stream, targetId, source) => {
  console.log("targetId", targetId);

  if (
    stream.video &&
    streamState.floating &&
    !clientState.client[targetId].projection
  ) {
    console.log("floating");
    const projectionStream = {
      ...stream,
      floating: true,
      position: clientState.client[targetId].position,
      target: targetId,
    };
    const projectionTargetId = Object.keys(clientState.client).find((key) => {
      return clientState.client[key].projection;
    });
    io.to(projectionTargetId).emit("streamFromServer", projectionStream);
  }
  // 20240922_あとで戻す
  // if (
  //   states.client[targetId].urlPathName !== undefined &&
  //   states.client[targetId].urlPathName.includes("pi") &&
  //   states.arduino.connected
  // ) {
  //   console.log("pi or not pi", states.client[targetId].urlPathName);
  //   const result = await switchCramp(source);
  //   console.log("switchCramp", result);
  // }
  io.to(targetId).emit("streamFromServer", stream);
};
