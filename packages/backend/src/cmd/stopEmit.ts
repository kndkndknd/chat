import SocketIO from "socket.io";
import { cmdStateType } from "../types/global";

export const stopEmit = (
  io: SocketIO.Server,
  state: cmdStateType,
  target?: "ALL" | "STREAM" | "CMD",
  client?: "client" | "sinewaveClient" | "all"
) => {
  /*
  io.emit('stopFromServer', {
    target: target,
    fadeOut: state.cmd.FADE.OUT
  })
  */
  // STOPは個別の関数があるのでVOICEはそこに相乗り
  if (state.cmd.VOICE.length > 0) {
    state.cmd.VOICE.forEach((element) => {
      //      io.to(element).emit('voiceFromServer', "STOP")
      io.to(element).emit("voiceFromServer", {
        text: "STOP",
        lang: state.cmd.voiceLang,
      });
    });
  }

  // current -> previous && current -> stop
  state.client.forEach((element) => {
    io.to(element).emit("stopFromServer", {
      target: target === undefined ? "ALL" : target,
      fadeOutVal: state.cmd.FADE.OUT,
    });
  });
  for (let cmd in state.current.cmd) {
    state.previous.cmd[cmd] = state.current.cmd[cmd];
    state.current.cmd[cmd] = [];
  }
  console.log("current sinewave", state.previous.sinewave);
  state.previous.sinewave = state.current.sinewave;
  state.current.sinewave = {};
  console.log("previous sinewave", state.previous.sinewave);

  for (let stream in state.current.stream) {
    state.previous.stream[stream] = state.current.stream[stream];
    state.current.stream[stream] = false;
  }
  Object.keys(state.stream.target).forEach((element) => {
    state.stream.target[element] = [];
  });
};
