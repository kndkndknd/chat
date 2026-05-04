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
import { ioState } from "../state/states/ioState";
import { streamsRedis } from "../data";
import { pickupStreamTarget, pickupPaStreamTarget } from "./pickupStreamTarget";
import { glitchStream } from "./glitchStream";
import { gridTimeoutVal } from "./gridTimeoutVal";

export const streamEmit = async (
  source: string,
  from?: string,
) => {
  currentState.stream[source] = true;
  console.log(`debug ${source} targetArr`, streamState.target[source]);
  let targetId =
    from === undefined
      ? pickupStreamTarget(source)
      : pickupStreamTarget(source, from);
  if (streamState.pa[source]) {
    targetId = pickupPaStreamTarget();
  }
  if (targetId === "") {
    return;
  }

  let buff: buffStateType;
  const bufferSize = await streamsRedis.getBufferSize(source);
  const audioLen = await streamsRedis.getAudioLength(source);
  const videoLen = await streamsRedis.getVideoLength(source);

  if (source === "EMPTY") {
    let audioBuff = new Float32Array(streamState.basisBufferSize);
    for (let i = 0; i < streamState.basisBufferSize; i++) {
      audioBuff[i] = 1.0;
    }
    buff = {
      source: source,
      bufferSize: streamState.basisBufferSize,
      audio: audioBuff.buffer,
      video: await streamsRedis.shiftVideo(source),
      duration: streamState.basisBufferSize / 44100,
    };
  } else {
    console.log("audio length:", audioLen);
    console.log("video length:", videoLen);
    if (audioLen > 0 || videoLen > 0) {
      if (!streamState.random[source]) {
        const index = await streamsRedis.getIndex(source);
        buff = {
          source: source,
          bufferSize: bufferSize,
          audio:
            audioLen > index
              ? await streamsRedis.getAudio(source, index)
              : new Float32Array(bufferSize).buffer,
          video:
            videoLen > index
              ? await streamsRedis.getVideo(source, index)
              : "",
          duration: bufferSize / 44100,
        };
        if (
          ((videoLen === 0) && index < audioLen - 1) ||
          (index < audioLen - 1 && index < videoLen - 1)
        ) {
          await streamsRedis.incrementIndex(source);
        } else {
          await streamsRedis.setIndex(source, 0);
        }
        console.log("index:", await streamsRedis.getIndex(source));
      } else {
        buff = {
          source: source,
          bufferSize: bufferSize,
          audio: await streamsRedis.getRandomAudio(source),
          video: await streamsRedis.getRandomVideo(source),
          duration: bufferSize / 44100,
        };
      }
    } else {
      ioState?.io.emit("stringsFromServer", { strings: "NO BUFFER", timeout: true });
    }
  }
  if (buff) {
    const stream = {
      source: source,
      sampleRate: sampleRateState.sampleRate[source],
      glitch: glitchState.glitch[source] ? glitchState.glitch[source] : false,
      filter: streamState.filter[source],
      ...buff,
    };
    if (glitchState.glitch[source] && stream.video && stream.video.length > 0) {
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
    }
    console.log("sampleRateState", sampleRateState);
    if (!stream.video) console.log("not video");
    console.log(
      "bpmState, gridFlag:",
      bpmState[targetId].stream[source].gridFlag,
    );
    if (!bpmState[targetId].stream[source].gridFlag) {
      ioEmitStreamFromServer(stream, targetId, source);
    } else {
      const timeOutVal = gridTimeoutVal(source, targetId);
      setTimeout(() => {
        if (currentState.stream[source]) {
          ioEmitStreamFromServer(stream, targetId, source);
        }
      }, timeOutVal);
    }
  } else {
    console.log("no buffer");
  }
};

const ioEmitStreamFromServer = async (stream, targetId, source) => {
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
    ioState?.io.to(projectionTargetId).emit("streamFromServer", projectionStream);
  }
  ioState?.io.to(targetId).emit("streamFromServer", stream);
};

export const paStreamEmit = async (
  source: string,
  io: SocketIO.Server,
) => {
  currentState.stream[source] = true;
  console.log(`debug ${source} targetArr`, streamState.target[source]);
  const targetId = pickupPaStreamTarget();
  if (targetId === "") {
    return;
  }

  let buff: buffStateType;
  const bufferSize = await streamsRedis.getBufferSize(source);
  const audioLen = await streamsRedis.getAudioLength(source);
  const videoLen = await streamsRedis.getVideoLength(source);

  if (source === "EMPTY") {
    let audioBuff = new Float32Array(streamState.basisBufferSize);
    for (let i = 0; i < streamState.basisBufferSize; i++) {
      audioBuff[i] = 1.0;
    }
    buff = {
      source: source,
      bufferSize: streamState.basisBufferSize,
      audio: audioBuff,
      video: await streamsRedis.shiftVideo(source),
      duration: streamState.basisBufferSize / 44100,
    };
  } else {
    console.log("audio length:", audioLen);
    console.log("video length:", videoLen);
    if (audioLen > 0 || videoLen > 0) {
      if (!streamState.random[source]) {
        const index = await streamsRedis.getIndex(source);
        buff = {
          source: source,
          bufferSize: bufferSize,
          audio:
            audioLen > index
              ? await streamsRedis.getAudio(source, index)
              : new Float32Array(bufferSize),
          video:
            videoLen > index
              ? await streamsRedis.getVideo(source, index)
              : "",
          duration: bufferSize / 44100,
        };
        if (
          ((videoLen === 0) && index < audioLen - 1) ||
          (index < audioLen - 1 && index < videoLen - 1)
        ) {
          await streamsRedis.incrementIndex(source);
        } else {
          await streamsRedis.setIndex(source, 0);
        }
        console.log("index:", await streamsRedis.getIndex(source));
      } else {
        buff = {
          source: source,
          bufferSize: bufferSize,
          audio: await streamsRedis.getRandomAudio(source),
          video: await streamsRedis.getRandomVideo(source),
          duration: bufferSize / 44100,
        };
      }
    } else {
      io.emit("stringsFromServer", { strings: "NO BUFFER", timeout: true });
    }
  }
  if (buff) {
    const stream = {
      source: source,
      sampleRate: sampleRateState.sampleRate[source],
      glitch: glitchState.glitch[source] ? glitchState.glitch[source] : false,
      filter: streamState.filter[source],
      ...buff,
    };
    if (glitchState.glitch[source] && stream.video && stream.video.length > 0) {
      stream.video = await glitchStream(stream.video);
    }

    if (sampleRateState.randomrate[source]) {
      stream.sampleRate =
        sampleRateState.randomraterange[source].min +
        Math.floor(
          Math.random() *
            (sampleRateState.randomraterange[source].max -
              sampleRateState.randomraterange[source].min)
        );
    }
    console.log("sampleRateState", sampleRateState);
    if (!stream.video) console.log("not video");
    console.log(
      "bpmState, gridFlag:",
      bpmState[targetId].stream[source].gridFlag
    );
    if (!bpmState[targetId].stream[source].gridFlag) {
      ioEmitStreamFromServer(stream, targetId, source);
    } else {
      const timeOutVal = gridTimeoutVal(source, targetId);
      setTimeout(() => {
        if (currentState.stream[source]) {
          ioEmitStreamFromServer(stream, targetId, source);
        }
      }, timeOutVal);
    }
  } else {
    console.log("no buffer");
  }
};
