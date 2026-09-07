import {
  clientState,
  currentState,
  streamState,
  previousState,
  flagState,
} from "../state";

import { cmdList, parameterList, streamList } from "../data";

import { execStop } from "./execStop";
import { splitSpace } from "./splitSpace";
import { splitPlus } from "./splitPlus";
import { voiceEmit } from "../socket/ioEmit";
import { stringEmit, mediaRecReqEmit, voskCallEmit, cmdEmit } from "../socket/ioEmit";
import { loadScenario } from "../scenario/loadScenario";
import { execScenario } from "../scenario/execScenario";
import { cmdLogging } from "../logging/cmdLogging";
import { mergeStreamTarget } from "../stream/mergeStreamTarget";

import { execStreamPreparation } from "../cmd/execStreamPreparation";
import { execEnter } from "./execEnter";

import { wholeEmit } from "../stream/wholeEmit";

export const receiveEnter = async (
  strings: string,
  id: string,
  // state: cmdStateType
) => {
  // console.log("receiveEnter", strings, id);
  if (strings === undefined || strings === null) {
    return;
  }
  cmdLogging(strings);

  if (strings === "CHATASYNC") {
    const clientIds = Object.keys(clientState.client).sort(
      (a, b) => clientState.client[a].index - clientState.client[b].index
    );
    const messages = ["chat", "(async)"];
    clientIds.forEach((cid, idx) => {
      stringEmit(messages[idx] ?? "", false, cid);
    });
  } else if (
    strings === "CHAT" ||
    strings === "RECORD" ||
    strings === "REC" ||
    streamList.includes(strings)
  ) {
    execStreamPreparation(strings, id);
  } else if (strings.includes(" ") /*&& strings.split(" ").length < 4*/) {
    splitSpace(strings.split(" "), id);
  } else if (strings.includes("+")) {
    splitPlus(strings.split("+"));
  } else if (
    Object.keys(cmdList).includes(strings) ||
    Number.isFinite(Number(strings)) ||
    strings === "SINEWAVE" ||
    strings === "PREVIOUS" ||
    strings === "PREV" ||
    strings === "NO" ||
    strings === "NUMBER" ||
    strings === "SWITCH" ||
    strings === "ROTATE" ||
    strings === "CLOCK" ||
    strings === "SOLFEGIO" ||
    strings === "FILTER" ||
    strings === "QUANTIZE" ||
    strings === "SELF" ||
    strings === "TORCH" ||
    strings === "BLINK" ||
    Object.keys(parameterList).includes(strings) ||
    strings === "TWICE" ||
    strings === "HALF" ||
    strings === "FUSEJI" ||
    strings === "EMOJI"
  ) {
    execEnter(strings, id);
  } else if (strings === "STOP") {
    console.log("stop");
    voiceEmit(strings, id);
    execStop("ALL");
    // io.emit("quantizeFromServer", quantizeObj[client].stream);
  // } else if (
  //   Object.keys(parameterList).includes(strings) ||
  //   strings === "TWICE" ||
  //   strings === "HALF" ||
  //   strings === "FUSEJI" ||
  //   strings === "EMOJI"
  // ) {
  //   changeCmdParam(strings, id);
  } else if (strings === "START" || strings === "SCENARIO") {
    const scenario = await loadScenario();
    await execScenario(scenario);
  } else if (strings === "FLOATING") {
    streamState.floating = !streamState.floating;
    stringEmit("FLOATING: " + streamState.floating, true);
  } else if (strings === "LATENCY") {
    cmdEmit(mergeStreamTarget(streamState), { cmd: "LATENCY" });
  } else if (strings === "MEDIARECORD") {
    console.log("MEDIARECORD CALL");
    // ioState?.io.emit("mediaRecReqFromServer");
    mediaRecReqEmit();
  } else if (strings === "VOSK") {
    console.log("VOSK CALL");
    // ioState?.io.emit("voskCallFromServer");
    voskCallEmit();
  } else if (strings === "WHOLE") {
    if(currentState.WHOLE){
      currentState.WHOLE = false;
      stringEmit("WHOLE CMD STOP", true);
    } else {
      currentState.WHOLE = true;
      wholeEmit();
      // stringEmit(io, "WHOLE CMD", true);
    }
  } else {
    voiceEmit(strings, id);
  }


  if (strings !== "STOP") {
    previousState.text = strings;
  }
};
