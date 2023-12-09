import SocketIO from "socket.io";
import { cmdStateType } from "../types/global";

export const chatPreparation = (io: SocketIO.Server, state: cmdStateType) => {
  console.log(state.current.stream.CHAT);
  if (!state.current.stream.CHAT) {
    console.log(state.client);
    state.current.stream.CHAT = true;
    const targetId =
      state.client[Math.floor(Math.random() * state.client.length)];
    io.to(targetId).emit("chatReqFromServer");
    if (state.cmd.VOICE.length > 0) {
      state.cmd.VOICE.forEach((element) => {
        io.to(element).emit("voiceFromServer", "CHAT");
      });
    }
  } else {
    state.current.stream.CHAT = false;
  }
};
