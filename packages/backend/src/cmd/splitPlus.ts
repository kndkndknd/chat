import { execCmd } from "./execCmd";
import { execSinewave } from "./execSinewave";
import { chatPreparation } from "../stream/chatPreparation";
import { execStream } from "../stream/execStream";
import { execStop } from "./execStop";
import { clientState, cmdState, currentState, streamState } from "../state";
import { cmdList, streamList, parameterList } from "../data";
import { sinewaveChange } from "./sinewaveChange";
import { parameterChange } from "../parameterChange";
import { getTypeArr } from "./splitSpace/getTypeArr";
import { mergeStreamTarget } from "../stream/mergeStreamTarget";
import { recordReqEmit, voiceEmit } from "../socket/ioEmit";

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
        recordReqEmit({ source: "PLAYBACK", timeout: 10000 });
        // if (cmdState.VOICE.length > 0) {
        //   cmdState.VOICE.forEach((element) => {
        //     voiceEmit(false, cmdState.voiceLang, element);
        //   });
        // }
      } else {
        currentState.RECORD = false;
      }
    } else if (streamList.includes(string)) {
      currentState.stream[string] = true;
      execStream(string);
    } else if (Object.keys(cmdList).includes(string)) {
      const target = clientState.cmdClient[Number(stringArr[0])];
      execCmd(cmdList[string], target);
    } else if (Number.isFinite(Number(string))) {
      const target = clientState.cmdClient[Number(stringArr[0])];
      execSinewave(Number(string), target);
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
      execStop("", "ALL");
    }
  });
};
