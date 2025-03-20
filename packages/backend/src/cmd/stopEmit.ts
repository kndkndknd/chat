import SocketIO from "socket.io";
import { voiceEmit } from "./voiceEmit";
import {
  clientState,
  cmdState,
  streamState,
  currentState,
  previousState,
} from "../states";

export const stopEmit = (
  io: SocketIO.Server,
  source: string,
  target?: "ALL" | "STREAM" | "CMD" | "ExceptHls",
  client?: string
) => {
  /*
  io.emit('stopFromServer', {
    target: target,
    fadeOut: state.cmd.FADE.OUT
  })
  */
  // STOPは個別の関数があるのでVOICEはそこに相乗り

  // if (state.cmd.VOICE.length > 0) {
  //   state.cmd.VOICE.forEach((element) => {
  //     //      io.to(element).emit('voiceFromServer', "STOP")
  //     io.to(element).emit("voiceFromServer", {
  //       text: "STOP",
  //       lang: state.cmd.voiceLang,
  //     });
  //   });
  // }
  if (source !== undefined && source !== "") {
    voiceEmit(io, "STOP", source);
  }

  // stop cmd / sinewave
  if (client === undefined) {
    // current -> previous && current -> stop
    Object.keys(clientState.client).forEach((element) => {
      io.to(element).emit("stopFromServer", {
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
    if (target !== "ExceptHls") {
      // state.hls = [];
    }
    // state.hls = [];
  } else if (Object.keys(clientState.client).includes(client)) {
    io.to(client).emit("stopFromServer", {
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
  // console.log("client", state.client);
  // console.log("hls", state.hls);
  // console.log("previous", state.previous);
};
