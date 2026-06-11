import { ioState } from "../state/states/ioState";
import { cmdEmit } from "./cmdEmit";
import { sinewaveEmit } from "./sinewaveEmit";
import { chatPreparation } from "../stream/chatPreparation";
import { streamEmit } from "../stream/streamEmit";
import { stopEmit } from "./stopEmit";
import { clientState, cmdState, currentState, streamState } from "../state";
import { cmdList, streamList, parameterList } from "../data";
import { sinewaveChange } from "./sinewaveChange";
import { parameterChange } from "../parameterChange";
import { getTypeArr } from "./splitSpace/getTypeArr";
import { mergeStreamTarget } from "../stream/mergeStreamTarget";

export const splitPlus = (
  stringArr: Array<string>,
  // state: cmdStateType
) => {
  const arrTypeArr = getTypeArr(stringArr);

  stringArr.forEach((string, index) => {
    // const target = Object.keys(clientState.client)[Number(stringArr[0])];
    if (string === "CHAT") {
      chatPreparation();
    } else if (string === "RECORD" || string === "REC") {
      if (!currentState.RECORD) {
        currentState.RECORD = true;
        ioState?.io.emit("recordReqFromServer", { target: "PLAYBACK", timeout: 10000 });
        if (cmdState.VOICE.length > 0) {
          cmdState.VOICE.forEach((element) => {
            ioState?.io.to(element).emit("voiceFromServer", {
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
      streamEmit(string);
    } else if (Object.keys(cmdList).includes(string)) {
      const target = clientState.cmdClient[Number(stringArr[0])];
      cmdEmit(cmdList[string], target);
    } else if (Number.isFinite(Number(string))) {
      const target = clientState.cmdClient[Number(stringArr[0])];
      sinewaveEmit(Number(string), target);
    } else if (string === "TWICE" || string === "HALF") {
      sinewaveChange(string);
      // } else if (strings === 'PREVIOUS' || strings === 'PREV') {
      // previousCmd(io, state)
    } else if (Object.keys(parameterList).includes(string)) {
      const target =
        string === "PORTAMENT"
          ? clientState.cmdClient[Number(stringArr[0])]
          : string === "VOICE" || string === "BPM"
            ? Object.keys(clientState.client)[Number(stringArr[0])]
            : mergeStreamTarget(streamState)[Number(stringArr[0])];
      parameterChange(parameterList[string], { source: target });
    } else if (string === "STOP") {
      stopEmit("", "ALL");
    }
  });
};
