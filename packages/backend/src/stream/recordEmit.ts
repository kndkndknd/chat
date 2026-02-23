import SocketIO from "socket.io";
import { currentState, cmdState } from "../state";
import { pushStateStream } from "./pushStateStream";

export const recordEmit = (io: SocketIO.Server, target?: string) => {
  console.log("target", target);
  // if (!currentState.RECORD) {
  currentState.RECORD = true;
  if (target && target !== undefined) {
    console.log(`target: ${target}`);
    io.to(target).emit("recordReqFromServer", {
      source: "PLAYBACK",
      timeout: 10000,
    });
  } else {
    console.log("all");
    io.emit("recordReqFromServer", { source: "PLAYBACK", timeout: 10000 });
  }
  if (cmdState.VOICE.length > 0) {
    cmdState.VOICE.forEach((element) => {
      //          io.to(element).emit('voiceFromServer', 'RECORD')
      io.to(element).emit("voiceFromServer", {
        text: "RECORD",
        lang: cmdState.voiceLang,
      });
    });
  }
  //     setTimeout(() => {
  //       currentState.RECORD = false;
  //     }, 10000);
  //   } else {
  //     currentState.RECORD = false;
  //   }
};

export const recordAsOtherEmit = (
  io: SocketIO.Server,
  // state: cmdStateType,
  source: string,
  target?: string,
) => {
  console.log("target", target);
  if (!currentState.RECORD) {
    console.log(`start record as ${source}`);
    currentState.RECORD = true;
    pushStateStream(source);
    if (target && target !== undefined) {
      console.log(`target: ${target}`);
      io.to(target).emit("recordReqFromServer", {
        source: source,
        timeout: 10000,
      });
    } else {
      console.log("all");
      io.emit("recordReqFromServer", { source: source, timeout: 10000 });
    }
    if (cmdState.VOICE.length > 0) {
      cmdState.VOICE.forEach((element) => {
        //          io.to(element).emit('voiceFromServer', 'RECORD')
        io.to(element).emit("voiceFromServer", {
          text: source,
          lang: cmdState.voiceLang,
        });
      });
    }
  } else {
    console.log(`stop record as ${source}`);
    currentState.RECORD = false;
  }
};
