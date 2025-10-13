import {
  frontQuantizeStateType,
  bpmClientStateType,
  bpmStreamStateType,
} from "../../../../types";
import {
  streamFlagState,
  streamChunk,
  contextState,
  quantizeState,
  socketState,
} from "../state";
import { chatReq } from "../stream";
import { quantizePlay } from "./quantizePlay";
import { millisecondsPerBar } from "../../../util/bpmCalc";

export const setQuantize = (
  data: bpmStreamStateType
): frontQuantizeStateType => {
  // if (data.flag) {
  const quantizeObj: frontQuantizeStateType = {
    flag: quantizeState.flag,
    bar: quantizeState.bar,
    beat: quantizeState.beat,
    stream: [],
    interval: quantizeState.interval,
    currentTime: quantizeState.currentTime,
    timeout: quantizeState.timeout,
  };

  const bar = millisecondsPerBar(data[Object.keys(data)[0]].bpm);
  if (quantizeState.interval !== null && bar === quantizeState.bar) {
    clearInterval(quantizeState.interval);
    quantizeState.interval = null;
  } else if (quantizeState.interval === null) {
    quantizeInterval(bar);
  } else {
    clearInterval(quantizeState.interval);
    quantizeState.interval = null;
    quantizeInterval(bar);
  }

  for (const stream in data) {
    if (data[stream] !== undefined) {
      quantizeObj.stream.push(stream);
    }
    quantizeObj.flag = data[stream].quantizeFlag;
    quantizeObj.beat = data[stream].beat;
    quantizeObj.bar = millisecondsPerBar(data[stream].bpm);
    // quantizeObj.interval = quantizeObj.bar;
  }

  if (!quantizeObj.flag && quantizeState.flag) {
    for (const stream in quantizeObj.stream) {
      clearInterval(quantizeState.interval);
      quantizeState.interval = null;
      for (const stream in streamChunk) {
        streamChunk[stream] = {};
      }
      if (streamFlagState[stream]) {
        if (stream === "CHAT") {
          chatReq(socketState.socketId);
        } else {
          socketState.socket.emit("streamReqFromClient", stream);
        }
      }
    }
  }
  return quantizeObj;

  //   // console.log(data);
  //   for (const streamEl of data.stream) {
  //     if (data.flag && !quantizeState.stream.includes(streamEl)) {
  //       quantizeObj.stream.push(streamEl);
  //     } else if (!data.flag && quantizeState.stream.includes(streamEl)) {
  //       quantizeObj.stream = quantizeState.stream.filter(
  //         (el) => el !== streamEl
  //       );
  //     }
  //   }
  //   if (quantizeState.interval !== null && data.bar === quantizeState.bar) {
  //     clearInterval(quantizeState.interval);
  //     quantizeState.interval = null;
  //   } else if (quantizeState.interval === null) {
  //     quantizeInterval(data.bar);
  //   } else {
  //     clearInterval(quantizeState.interval);
  //     quantizeState.interval = null;
  //     quantizeInterval(data.bar);
  //   }
  //   return quantizeObj;
  // } else {
  //   if (quantizeState.flag) {
  //     clearInterval(quantizeState.interval);
  //     quantizeState.interval = null;
  //     for (const stream in streamChunk) {
  //       streamChunk[stream] = {};
  //     }
  //   }
  //   for (const stream in streamFlagState) {
  //     if (streamFlagState[stream]) {
  //       if (stream === "CHAT") {
  //         chatReq(socketState.socketId);
  //       } else {
  //         socketState.socket.emit("streamReqFromClient", stream);
  //       }
  //     }
  //   }
  //   return {
  //     flag: false,
  //     bar: quantizeState.bar,
  //     beat: quantizeState.beat,
  //     stream: [],
  //     interval: quantizeState.interval,
  //     timeout: 0,
  //     currentTime: 0,
  //   };
  // }
};

const quantizeInterval = (bar: number) => {
  quantizeState.interval = window.setInterval(() => {
    console.log("streamFlagState", streamFlagState);
    console.log("streamChunkFlag", Object.keys(streamChunk));
    for (const stream of quantizeState.stream) {
      // console.log("stream", stream);
      if (
        streamFlagState[stream] &&
        streamChunk[stream] !== undefined &&
        streamChunk[stream].audio !== undefined
      ) {
        quantizePlay(streamChunk[stream]);
      }
    }
    quantizeState.currentTime = contextState.audioContext.currentTime;
    console.log("currentTime", quantizeState.currentTime);
  }, bar);
};
