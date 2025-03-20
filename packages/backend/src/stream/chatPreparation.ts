import SocketIO from "socket.io";
import { pickupStreamTarget } from "./pickupStreamTarget";
import { currentState } from "../states";

export const chatPreparation = async (io: SocketIO.Server) => {
  console.log(currentState.stream.CHAT);
  if (!currentState.stream.CHAT) {
    // console.log(state.client);
    currentState.stream.CHAT = true;
    const targetId = pickupStreamTarget("CHAT");
    console.log(targetId);
    // if (targetId !== "arduino") {
    io.to(targetId).emit("chatReqFromServer");
    // if (state.cmd.VOICE.length > 0) {
    //   state.cmd.VOICE.forEach((element) => {
    //     io.to(element).emit("voiceFromServer", "CHAT");
    //   });
    // }
    // } else {
    //   const crampResult = await switchCramp();
    //   if (crampResult) {
    //     await chatEmit(io);
    //   } else {
    //     setTimeout(() => {
    //       chatEmit(io);
    //     }, 500);
    //   }
    // }
  } else {
    currentState.stream.CHAT = false;
  }
};

// 20Hzを44100Hzのときの基準値としてみよう
