import SocketIO from "socket.io";
import { cmdStateType } from "../types/global";
import { pickupStreamTarget } from "./pickupStreamTarget";
import { switchCramp } from "../arduinoAccess/arduinoAccess";
import { basisBufferSize } from "../states";
import { time } from "console";
import { chatEmit } from "./chatReceive";

export const chatPreparation = async (
  io: SocketIO.Server,
  state: cmdStateType
) => {
  console.log(state.current.stream.CHAT);
  if (!state.current.stream.CHAT) {
    console.log(state.client);
    state.current.stream.CHAT = true;
    const targetId = pickupStreamTarget(state, "CHAT");
    console.log(targetId);
    // if (targetId !== "arduino") {
    io.to(targetId).emit("chatReqFromServer");
    if (state.cmd.VOICE.length > 0) {
      state.cmd.VOICE.forEach((element) => {
        io.to(element).emit("voiceFromServer", "CHAT");
      });
    }
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
    state.current.stream.CHAT = false;
  }
};

// 20Hzを44100Hzのときの基準値としてみよう
