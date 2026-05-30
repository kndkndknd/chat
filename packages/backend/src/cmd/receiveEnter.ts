import { ioState } from "../state/states/ioState";
import {
  clientState,
  cmdState,
  currentState,
  streamState,
  previousState,
  flagState,
} from "../state";

import { cmdList, parameterList, streamList } from "../data";

import { streamEmit } from "../stream/streamEmit";
import { cmdEmit } from "./cmdEmit";
import { stopEmit } from "./stopEmit";
import { splitSpace } from "./splitSpace";
import { splitPlus } from "./splitPlus";
import { sinewaveEmit } from "./sinewaveEmit";
import { sinewaveChange } from "./sinewaveChange";
import { parameterChange } from "../parameterChange";
import { voiceEmit } from "./voiceEmit";
import { chatPreparation } from "../stream/chatPreparation";
// import { putString } from "./putString";
import { recordEmit } from "../stream/recordEmit";
import { switchCtrl } from "../arduinoAccess/arduinoAccess";
import { stringEmit } from "../socket/ioEmit";
import { previousCmd } from "./previousCmd";
import { getLiveStream } from "../stream/getLiveStream";
import { loadScenario } from "../scenario/loadScenario";
import { execScenario } from "../scenario/execScenario";
import { scenarioItsuki } from "../scenario/scenarioItsuki";
import { putCmd } from "./putCmd";
import { cmdLogging } from "../logging/cmdLogging";
import { quantizeCmd } from "../stream/quantize";
import { mergeStreamTarget } from "../stream/mergeStreamTarget";
import { millisecondsPerBar } from "../util/bpmCalc";

import { execStream } from "../cmd/execStream";
import { execCmd } from "./execCmd";
import { changeCmdParam } from "./changeCmdParam";

import { wholeEmit } from "../stream/wholeEmit";
import { replay } from "../scenario/replay";
import { startWebRTCSession, stopWebRTCSession } from "../webRTC/weriftClient";
import { startCameraRotation, stopCameraRotation } from "../webRTC/cameraRotator";

export const receiveEnter = async (
  strings: string,
  id: string,
  // state: cmdStateType
) => {
  console.log("receiveEnter", strings, id);
  if (strings === undefined || strings === null) {
    return;
  }
  console.log("flagState.scenario", flagState.scenario);
  if (!flagState.scenario || strings === "REPLAY") {
    console.log("logging in receiveEnter");
    cmdLogging(strings);
  }

  //VOICE
  // if (strings.includes("VOICE ")) {
  // voiceEmit(io, strings, id, state);
  // }

  /*
  if(strings === 'INSERT') {
    const result = postMongo()
  }
  */

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
    execStream(strings, id);
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
    strings === "BLINK"
  ) {
    execCmd(strings, id);
  } else if (strings === "STOP") {
    console.log("stop");
    voiceEmit(strings, id);
    stopEmit("ALL");
    // io.emit("quantizeFromServer", quantizeObj[client].stream);
  } else if (
    Object.keys(parameterList).includes(strings) ||
    strings === "TWICE" ||
    strings === "HALF" ||
    strings === "FUSEJI" ||
    strings === "EMOJI"
  ) {
    changeCmdParam(strings, id);
  } else if (strings === "START" || strings === "SCENARIO") {
    const scenario = await loadScenario();
    await execScenario(scenario);
  } else if (strings === "SCENARIOITSUKI") {
    await scenarioItsuki();
  } else if (id === "scenario") {
    console.log("scenario", strings);
    if (cmdState.VOICE.length > 0) {
      console.log("voiceEmit scenario");
      voiceEmit(strings, "scenario");
    }
    stringEmit(strings, false);
  } else if (strings === "FLOATING") {
    streamState.floating = !streamState.floating;
    stringEmit("FLOATING: " + streamState.floating, true);
  } else if (strings === "LATENCY") {
    putCmd(mergeStreamTarget(streamState), { cmd: "LATENCY" });
  } else if (
    strings === "TWITCASTING" ||
    strings === "TWICAS" ||
    strings === "TWITCAS"
  ) {
    const qWord = "TWITCASTING";
    console.log("qWord", qWord);
    const result = await getLiveStream("LIVESTREAM", qWord);
    console.log("get livestream", result);
    if (result) {
      stringEmit("GET LIVESTREAM: SUCCESS");
    } else {
      stringEmit("GET LIVESTREAM: FAILED");
    }
  } else if (strings === "CALL") {
    startWebRTCSession();
    // 接続中の全クライアントを 20 秒ごとにローテーションして送信元にする。
    // (受信側パイプラインは werift recv recorder のままで 1 系統。)
    startCameraRotation();
  } else if (strings === "STOPWEBRTC") {
    // ローテーションを止めてから webRTC セッション全体を停止する。
    stopCameraRotation();
    stopWebRTCSession();
    console.log("[STOPWEBRTC] werift session stop requested");
  } else if (strings === "VOSK") {
    console.log("VOSK CALL");
    ioState?.io.emit("voskCallFromServer");
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
