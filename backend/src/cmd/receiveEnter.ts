import SocketIO from "socket.io";
import { cmdStateType } from "../types/global";
import { cmdList, streamList, parameterList } from "../states";

import { streamEmit } from "../stream/streamEmit";
import { cmdEmit } from "./cmdEmit";
import { stopEmit } from "./stopEmit";
import { splitSpace } from "./splitSpace";
import { sinewaveEmit } from "./sinewaveEmit";
import { sinewaveChange } from "./sinewaveChange";
import { parameterChange } from "./parameterChange";
import { voiceEmit } from "./voiceEmit";
import { chatPreparation } from "../stream/chatPreparation";

export const receiveEnter = (
  strings: string,
  id: string,
  io: SocketIO.Server,
  state: cmdStateType
) => {
  //VOICE
  voiceEmit(io, strings, state);

  /*
  if(strings === 'INSERT') {
    const result = postMongo()
  }
  */
  if (strings === "MACBOOK" || strings === "THREE") {
    io.emit("threeSwitchFromServer", true);
  } else if (strings === "CHAT") {
    chatPreparation(io, state);
  } else if (strings === "RECORD" || strings === "REC") {
    if (!state.current.RECORD) {
      state.current.RECORD = true;
      io.emit("recordReqFromServer", { target: "PLAYBACK", timeout: 10000 });
      if (state.cmd.VOICE.length > 0) {
        state.cmd.VOICE.forEach((element) => {
          //          io.to(element).emit('voiceFromServer', 'RECORD')
          io.to(element).emit("voiceFromServer", {
            text: "RECORD",
            lang: state.cmd.voiceLang,
          });
        });
      }
    } else {
      state.current.RECORD = false;
    }
  } else if (strings.includes(" ") && strings.split(" ").length < 4) {
    splitSpace(strings.split(" "), io, state);
  } else if (streamList.includes(strings)) {
    console.log("in stream");
    state.current.stream[strings] = true;
    streamEmit(strings, io, state);
  } else if (Object.keys(cmdList).includes(strings)) {
    console.log("in cmd");
    cmdEmit(cmdList[strings], io, state);
  } else if (Number.isFinite(Number(strings))) {
    console.log("sinewave");
    sinewaveEmit(strings, io, state);
  } else if (strings === "TWICE" || strings === "HALF") {
    sinewaveChange(strings, io, state);
    // } else if (strings === 'PREVIOUS' || strings === 'PREV') {
    // previousCmd(io, state)
  } else if (strings === "STOP") {
    stopEmit(io, state);
  } else if (Object.keys(parameterList).includes(strings)) {
    parameterChange(parameterList[strings], io, state, { source: id });
  } else if (strings === "NO" || strings === "NUMBER") {
    state.client.forEach((id, index) => {
      console.log(id);
      io.to(id).emit("stringsFromServer", {
        strings: String(index),
        timeout: true,
      });
      //putString(io, String(index), state)
    });
  }
  if (strings !== "STOP") {
    state.previous.text = strings;
  }
};
