import SocketIO from "socket.io";
import { cmdEmit } from "./cmdEmit";
import { sinewaveEmit } from "./sinewaveEmit";
import { chatPreparation } from "../stream/chatPreparation";
import { streamEmit } from "../stream/streamEmit";
import { stopEmit } from "./stopEmit";
import { clientState, cmdState, currentState } from "../state";
import { cmdList, streamList, parameterList } from "../data";
import { sinewaveChange } from "./sinewaveChange";
import { parameterChange } from "../parameterChange";
import { getTypeArr } from "./splitSpace/getTypeArr";

export const splitPlus = (
  stringArr: Array<string>,
  io: SocketIO.Server
  // state: cmdStateType
) => {
  const arrTypeArr = getTypeArr(stringArr);

  stringArr.forEach((string, index) => {
    const target = Object.keys(clientState.client)[Number(stringArr[0])];
    if (string === "CHAT") {
      chatPreparation(io);
    } else if (string === "RECORD" || string === "REC") {
      if (!currentState.RECORD) {
        currentState.RECORD = true;
        io.emit("recordReqFromServer", { target: "PLAYBACK", timeout: 10000 });
        if (cmdState.VOICE.length > 0) {
          cmdState.VOICE.forEach((element) => {
            io.to(element).emit("voiceFromServer", {
              text: "RECORD",
              lang: cmdState.voiceLang,
            });
          });
        }
      } else {
        currentState.RECORD = false;
      }
    } else if (streamList.includes(string)) {
      currentState.stream[string] = true;
      streamEmit(string, io);
    } else if (Object.keys(cmdList).includes(string)) {
      cmdEmit(cmdList[string], io, target);
    } else if (Number.isFinite(Number(string))) {
      sinewaveEmit(Number(string), io, target);
    } else if (string === "TWICE" || string === "HALF") {
      sinewaveChange(string, io);
      // } else if (strings === 'PREVIOUS' || strings === 'PREV') {
      // previousCmd(io, state)
    } else if (Object.keys(parameterList).includes(string)) {
      parameterChange(parameterList[string], io, { source: target });
    } else if (string === "STOP") {
      stopEmit(io, "", "ALL");
    }
  });
};
