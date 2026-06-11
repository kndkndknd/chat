import { ioState } from "../state/states/ioState";
import { voiceEmit } from "./voiceEmit";
import {
  clientState,
  cmdState,
  streamState,
  currentState,
  previousState,
} from "../state";
import { wholeParams } from "../data/list/wholeParams";

export const stopEmit = (
  source: string,
  target?: "ALL" | "STREAM" | "CMD",
  client?: string
) => {
  if (source !== undefined && source !== "") {
    voiceEmit("STOP", source);
  }

  wholeParams.targetArr = [];
  currentState.WHOLE = false;

  // stop cmd / sinewave | self判定あり
  if (client === undefined) {
    if (
      clientState.client[source] === undefined ||
      !clientState.client[source].self
    ) {
      Object.keys(clientState.client).forEach((element) => {
        ioState?.io.to(element).emit("stopFromServer", {
          target: target === undefined ? "ALL" : target,
          fadeOutVal: cmdState.FADE.OUT,
        });
      });
      for (let cmd in currentState.cmd) {
        previousState.cmd[cmd] = currentState.cmd[cmd];
        currentState.cmd[cmd] = [];
      }
      previousState.sinewave = currentState.sinewave;
      currentState.sinewave = {};
    } else {
      ioState?.io.to(source).emit("stopFromServer", {
        target: target === undefined ? "ALL" : target,
        fadeOutVal: cmdState.FADE.OUT,
      });
      for (let cmd in currentState.cmd) {
        if (currentState.cmd[cmd].includes(source)) {
          previousState.cmd[cmd] = currentState.cmd[cmd];
          currentState.cmd[cmd] = currentState.cmd[cmd].filter(
            (element) => element !== source
          );
        }
      }
      if (currentState.sinewave[source] !== undefined) {
        previousState.sinewave[source] = currentState.sinewave[source];
        delete currentState.sinewave[source];
      }
    }
  } else if (Object.keys(clientState.client).includes(client)) {
    ioState?.io.to(client).emit("stopFromServer", {
      target: target === undefined ? "ALL" : target,
      fadeOutVal: cmdState.FADE.OUT,
    });
    for (let cmd in currentState.cmd) {
      if (currentState.cmd[cmd].includes(client)) {
        previousState.cmd[cmd] = currentState.cmd[cmd];
        currentState.cmd[cmd] = currentState.cmd[cmd].filter(
          (element) => element !== client
        );
      }
    }
    if (currentState.sinewave[client] !== undefined) {
      previousState.sinewave[client] = currentState.sinewave[client];
      delete currentState.sinewave[client];
    }
  }

  // stop stream
  for (let stream in currentState.stream) {
    previousState.stream[stream] = currentState.stream[stream];
    currentState.stream[stream] = false;
  }
  Object.keys(streamState.target).forEach((element) => {
    streamState.target[element] = [];
  });
  Object.keys(streamState.pa).forEach((element)=> {
    streamState.pa[element] = false;
  })
};
