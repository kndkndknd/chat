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
  timestamp?: number,
  index?: number,
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
  const buffLen = await streamsRedis.getLength(source);

  if (source === "EMPTY") {
    const audioBuff = new Float32Array(streamState.basisBufferSize);
    for (let i = 0; i < streamState.basisBufferSize; i++) {
      audioBuff[i] = 1.0;
    }
    const shifted = await streamsRedis.shift(source);
    buff = {
      source: source,
      bufferSize: streamState.basisBufferSize,
      audio: audioBuff.buffer,
      video: shifted?.video ?? "",
      duration: streamState.basisBufferSize / 44100,
    };
  } else {
    console.log("buff length:", buffLen);
    if (buffLen > 0) {
      if (!streamState.random[source]) {
        if (index !== undefined) {
          // index は recordIndex（録音セッションID）。同一recordIndexの
          // バッファをタイムスタンプ昇順（古い順）で1つずつ送信する。
          // positions は getPositionsByRecordIndex により timestamp 昇順。
          const positions = await streamsRedis.getPositionsByRecordIndex(
            source,
            index,
          );
          if (positions.length > 0) {
            // recordIndex 専用カーソルで送出位置を管理する。
            // from === undefined は実行開始なので先頭（最古）から。
            // 継続時は前回の続き。末尾まで送ったら先頭に戻る。
            const ordinal =
              from === undefined
                ? 0
                : (await streamsRedis.getRecordCursor(source, index)) %
                  positions.length;
            const pos = positions[ordinal];
            await streamsRedis.setRecordCursor(
              source,
              index,
              (ordinal + 1) % positions.length,
            );
            const entry = await streamsRedis.get(source, pos);
            const bufferSize = entry?.bufferSize ?? streamState.basisBufferSize;
            buff = {
              source: source,
              bufferSize: bufferSize,
              audio: entry?.audio ?? new Float32Array(bufferSize).buffer,
              video: entry?.video ?? "",
              duration: entry?.duration ?? bufferSize / 44100,
            };
            console.log(
              `recordIndex ${index} seek -> listPos ${pos} (${ordinal + 1}/${positions.length})`,
            );
          }
        } else if (timestamp !== undefined) {
          const closest = await streamsRedis.findClosestByTimestamp(source, timestamp);
          if (closest !== null) {
            await streamsRedis.setIndex(source, closest.firstIndex);
            const bufferSize = closest.entry.bufferSize ?? streamState.basisBufferSize;
            buff = {
              source: source,
              bufferSize: bufferSize,
              audio: closest.entry.audio ?? new Float32Array(bufferSize).buffer,
              video: closest.entry.video ?? "",
              duration: closest.entry.duration ?? bufferSize / 44100,
            };
            if (closest.firstIndex < buffLen - 1) {
              await streamsRedis.incrementIndex(source);
            } else {
              await streamsRedis.setIndex(source, 0);
            }
            console.log("timestamp seek index:", await streamsRedis.getIndex(source));
          }
        }
        if (buff === undefined) {
          const currentIndex = await streamsRedis.getIndex(source);
          const entry = currentIndex < buffLen ? await streamsRedis.get(source, currentIndex) : null;
          const bufferSize = entry?.bufferSize ?? streamState.basisBufferSize;
          buff = {
            source: source,
            bufferSize: bufferSize,
            audio: entry?.audio ?? new Float32Array(bufferSize).buffer,
            video: entry?.video ?? "",
            duration: entry?.duration ?? bufferSize / 44100,
          };
          if (currentIndex < buffLen - 1) {
            await streamsRedis.incrementIndex(source);
          } else {
            await streamsRedis.setIndex(source, 0);
          }
          console.log("index:", await streamsRedis.getIndex(source));
        }
      } else {
        const entry = await streamsRedis.getRandom(source);
        const bufferSize = entry?.bufferSize ?? streamState.basisBufferSize;
        buff = {
          source: source,
          bufferSize: bufferSize,
          audio: entry?.audio ?? new Float32Array(bufferSize).buffer,
          video: entry?.video ?? "",
          duration: entry?.duration ?? bufferSize / 44100,
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
      ...(index !== undefined ? { index } : {}),
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
      bpmState[targetId]?.stream?.[source]?.gridFlag,
    );
    if (!bpmState[targetId]?.stream?.[source]?.gridFlag) {
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
    clientState.client[targetId] &&
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
) => {
  currentState.stream[source] = true;
  console.log(`debug ${source} targetArr`, streamState.target[source]);
  const targetId = pickupPaStreamTarget();
  if (targetId === "") {
    return;
  }

  let buff: buffStateType;
  const buffLen = await streamsRedis.getLength(source);

  if (source === "EMPTY") {
    const audioBuff = new Float32Array(streamState.basisBufferSize);
    for (let i = 0; i < streamState.basisBufferSize; i++) {
      audioBuff[i] = 1.0;
    }
    const shifted = await streamsRedis.shift(source);
    buff = {
      source: source,
      bufferSize: streamState.basisBufferSize,
      audio: audioBuff.buffer,
      video: shifted?.video ?? "",
      duration: streamState.basisBufferSize / 44100,
    };
  } else {
    console.log("buff length:", buffLen);
    if (buffLen > 0) {
      if (!streamState.random[source]) {
        const index = await streamsRedis.getIndex(source);
        const entry = index < buffLen ? await streamsRedis.get(source, index) : null;
        const bufferSize = entry?.bufferSize ?? streamState.basisBufferSize;
        buff = {
          source: source,
          bufferSize: bufferSize,
          audio: entry?.audio ?? new Float32Array(bufferSize).buffer,
          video: entry?.video ?? "",
          duration: entry?.duration ?? bufferSize / 44100,
        };
        if (index < buffLen - 1) {
          await streamsRedis.incrementIndex(source);
        } else {
          await streamsRedis.setIndex(source, 0);
        }
        console.log("index:", await streamsRedis.getIndex(source));
      } else {
        const entry = await streamsRedis.getRandom(source);
        const bufferSize = entry?.bufferSize ?? streamState.basisBufferSize;
        buff = {
          source: source,
          bufferSize: bufferSize,
          audio: entry?.audio ?? new Float32Array(bufferSize).buffer,
          video: entry?.video ?? "",
          duration: entry?.duration ?? bufferSize / 44100,
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
              sampleRateState.randomraterange[source].min)
        );
    }
    console.log("sampleRateState", sampleRateState);
    if (!stream.video) console.log("not video");
    console.log(
      "bpmState, gridFlag:",
      bpmState[targetId]?.stream?.[source]?.gridFlag
    );
    if (!bpmState[targetId]?.stream?.[source]?.gridFlag) {
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
