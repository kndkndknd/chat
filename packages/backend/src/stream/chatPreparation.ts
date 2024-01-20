import SocketIO from "socket.io";
import { cmdStateType } from "../types/global";
import { pickupStreamTarget } from "./pickupStreamTarget";

export const chatPreparation = (io: SocketIO.Server, state: cmdStateType) => {
  console.log(state.current.stream.CHAT);
  if (!state.current.stream.CHAT) {
    console.log(state.client);
    state.current.stream.CHAT = true;
    const targetId = pickupStreamTarget(state, "CHAT");
    console.log(targetId);
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
