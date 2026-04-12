import { voiceEmit } from "./voiceEmit";
import {
  clientState,
  cmdState,
  streamState,
  currentState,
  previousState,
} from "../state";
import { broadcastEmit, targetEmit } from "../webSocket";

export const stopEmit = (
  source: string,
  target?: "ALL" | "STREAM" | "CMD" | "ExceptHls",
  client?: string,
) => {
  if (source !== undefined && source !== "") {
    voiceEmit("STOP", source);
  }

  // stop cmd / sinewave | self判定あり
  if (client === undefined) {
    // current -> previous && current -> stop
    if (
      clientState.client[source] === undefined ||
      !clientState.client[source].self
    ) {
      broadcastEmit({
        type: "stop",
        payload: {
          target: target === undefined ? "ALL" : target,
          fadeOutVal: cmdState.FADE.OUT,
        },
      });
      // Object.keys(clientState.client).forEach((element) => {
      //   targetEmit(element, {
      //     type: "STOP",
      //     target: target === undefined ? "ALL" : target,
      //     fadeOutVal: cmdState.FADE.OUT,
      //   });
      // });
      for (let cmd in currentState.cmd) {
        previousState.cmd[cmd] = currentState.cmd[cmd];
        currentState.cmd[cmd] = [];
      }
      previousState.sinewave = currentState.sinewave;
      currentState.sinewave = {};
      if (target !== "ExceptHls") {
        // state.hls = [];
      }
    } else {
      targetEmit(source, {
        type: "STOP",
        payload: {
          target: target === undefined ? "ALL" : target,
          fadeOutVal: cmdState.FADE.OUT,
        },
      });
      for (let cmd in currentState.cmd) {
        if (currentState.cmd[cmd].includes(source)) {
          previousState.cmd[cmd] = currentState.cmd[cmd];
          currentState.cmd[cmd] = currentState.cmd[cmd].filter(
            (element) => element !== source,
          );
        }
      }
      if (currentState.sinewave[source] !== undefined) {
        previousState.sinewave[source] = currentState.sinewave[source];
        delete currentState.sinewave[source];
      }
    }
    // state.hls = [];
  } else if (Object.keys(clientState.client).includes(client)) {
    targetEmit(client, {
      type: "STOP",
      payload: {
        target: target === undefined ? "ALL" : target,
        fadeOutVal: cmdState.FADE.OUT,
      },
    });
    for (let cmd in currentState.cmd) {
      if (currentState.cmd[cmd].includes(client)) {
        previousState.cmd[cmd] = currentState.cmd[cmd];
        currentState.cmd[cmd] = currentState.cmd[cmd].filter(
          (element) => element !== client,
        );
      }
    }
    if (currentState.sinewave[client] !== undefined) {
      previousState.sinewave[client] = currentState.sinewave[client];
      delete currentState.sinewave[client];
    }
    // if (target !== "ExceptHls") {
    //   state.hls = state.hls.filter((element) => element !== client);
    // }
    // state.hls = state.hls.filter((element) => element !== client);
  }

  // stop stream
  for (let stream in currentState.stream) {
    previousState.stream[stream] = currentState.stream[stream];
    currentState.stream[stream] = false;
  }
  Object.keys(streamState.target).forEach((element) => {
    streamState.target[element] = [];
  });
  Object.keys(streamState.pa).forEach((element) => {
    streamState.pa[element] = false;
  });
  // console.log("client", state.client);
  // console.log("hls", state.hls);
  // console.log("previous", state.previous);
};
