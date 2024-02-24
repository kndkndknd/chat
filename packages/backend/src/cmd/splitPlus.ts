import SocketIO from "socket.io";
import { cmdStateType } from "../types/global";
import { cmdEmit } from "./cmdEmit";
import { sinewaveEmit } from "./sinewaveEmit";
import { chatPreparation } from "../stream/chatPreparation";
import { streamEmit } from "../stream/streamEmit";
import { stopEmit } from "./stopEmit";
import { cmdList, streamList, parameterList } from "../states";
import { sinewaveChange } from "./sinewaveChange";
import { parameterChange } from "./parameterChange";

export const splitPlus = (
  stringArr: Array<string>,
  io: SocketIO.Server,
  state: cmdStateType
) => {
  const arrTypeArr = stringArr.map((string) => {
    if (/^([1-9]\d*|0)(\.\d+)?$/.test(string)) {
      return "number";
    } else if (/^[A-Za-z]*$/.test(string)) {
      return "string";
    } else {
      return "other";
    }
  });

  stringArr.forEach((string, index) => {
    const target = state.client[Number(stringArr[0])];
    if (string === "CHAT") {
      chatPreparation(io, state);
    } else if (string === "RECORD" || string === "REC") {
      if (!state.current.RECORD) {
        state.current.RECORD = true;
        io.emit("recordReqFromServer", { target: "PLAYBACK", timeout: 10000 });
        if (state.cmd.VOICE.length > 0) {
          state.cmd.VOICE.forEach((element) => {
            io.to(element).emit("voiceFromServer", {
              text: "RECORD",
              lang: state.cmd.voiceLang,
            });
          });
        }
      } else {
        state.current.RECORD = false;
      }
    } else if (streamList.includes(string)) {
      state.current.stream[string] = true;
      streamEmit(string, io, state);
    } else if (Object.keys(cmdList).includes(string)) {
      cmdEmit(cmdList[string], io, state, target);
    } else if (Number.isFinite(Number(string))) {
      sinewaveEmit(Number(string), io, state, target);
    } else if (string === "TWICE" || string === "HALF") {
      sinewaveChange(string, io, state);
      // } else if (strings === 'PREVIOUS' || strings === 'PREV') {
      // previousCmd(io, state)
    } else if (Object.keys(parameterList).includes(string)) {
      parameterChange(parameterList[string], io, state, { source: target });
    } else if (string === "STOP") {
      stopEmit(io, state, "ALL");
    }
  });
};
