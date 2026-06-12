import { ioState } from "../state/states/ioState";
import { pickupStreamTarget, pickupPaStreamTarget } from "./pickupStreamTarget";
import { currentState, streamState, clientState } from "../state";

export const chatPreparation = async () => {
  console.log(currentState.stream.CHAT);
  if (!currentState.stream.CHAT) {
    // console.log(state.client);
    currentState.stream.CHAT = true;
    const targetId = pickupStreamTarget("CHAT");
    if(targetId === "") {
      return
    }

    console.log(targetId);
    // if (targetId !== "arduino") {
    ioState?.io.to(targetId).emit("chatReqFromServer");
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

export const paChatPreparation = async() => {
  if (!currentState.stream.CHAT) {
    // console.log(state.client);
    currentState.stream.CHAT = true;
    const targetId = pickupPaStreamTarget();
    if(targetId === "") {
      return
    }

    console.log(targetId);
    // if (targetId !== "arduino") {
    ioState?.io.to(targetId).emit("chatReqFromServer");
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

}

// 20Hzを44100Hzのときの基準値としてみよう
