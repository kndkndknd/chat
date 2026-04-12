import {
  cmdState,
  clientState,
  arduinoState,
  streamState,
  flagState,
  previousState,
  bpmStateDefault,
  bpmState,
  webSocketState,
} from "../state";

import { cmdList, parameterList, streamList } from "../data";

import { stopEmit } from "./stopEmit";
import { splitSpace } from "./splitSpace";
import { splitPlus } from "./splitPlus";
import { voiceEmit } from "./voiceEmit";
import { stringEmit } from "../socket/ioEmit";
import { getLiveStream } from "../stream/getLiveStream";
import { loadScenario } from "../scenario/loadScenario";
import { execScenario } from "../scenario/execScenario";
import { putCmd } from "./cmdEmit";
import { cmdLogging } from "../logging/cmdLogging";
import { mergeStreamTarget } from "../stream/mergeStreamTarget";

import { execStream } from "../cmd/execStream";
import { execCmd } from "./execCmd";
import { changeCmdParam } from "./changeCmdParam";
import { broadcastEmit, targetEmit } from "../webSocket";

export const receiveEnter = async (strings: string, id: string) => {
  cmdLogging(strings);

  //VOICE
  // if (strings.includes("VOICE ")) {
  // voiceEmit(io, strings, id, state);
  // }

  /*
  if(strings === 'INSERT') {
    const result = postMongo()
  }
  */

  if (
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
    stopEmit(id, "ALL");
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
    //   const result = await getLiveStream("TWITCH");
    //   console.log("get livestream as ", strings, result);
    //   if (result) {
    //     stringEmit(io, "GET TWITCH: SUCCESS");
    //   } else {
    //     stringEmit(io, "GET TWITCH: FAILED");
    //   }
    // } else if (strings === "HLS") {
    //   const cmd: {
    //     cmd: string;
    //     property: string;
    //     value: number;
    //     flag: boolean;
    //     target?: string;
    //     overlay?: boolean;
    //     fade?: number;
    //     portament?: number;
    //     gain?: number;
    //     solo?: boolean;
    //   } = {
    //     cmd: "HLS",
    //     property: "OGAWA",
    //     value: 0,
    //     flag: true,
    //   };
    //   io.emit("cmdFromServer", cmd);
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
      stringEmit("GET LIVESTREAM: SUCCESS", true);
    } else {
      stringEmit("GET LIVESTREAM: FAILED", true);
    }
  } else if (strings === "CALL") {
    // io.to(id).emit("webRtcOfferReqFromServer");
    targetEmit(id, { type: "webrtc", payload: { type: "offerReq" } });
  } else if (strings === "VOSK") {
    console.log("VOSK CALL");
    // io.emit("voskCallFromServer");
    // broadcastEmit({ type: "vosk", payload: { type: "call" } });
    broadcastEmit({ type: "params", payload: { type: "vosk", param: "call" } });
  } else if (strings === "VIDEO") {
    // flagState.video = !flagState.video;
    console.log("videoRequestFromServer");
    // io.emit("videoRequestFromServer");
    broadcastEmit({ type: "streamReq", payload: { source: "video" } });
  } else if (strings === "VIDEORECORD") {
    console.log("videoRecordRequestFromServer");
    // io.to(id).emit("videoRecordRequestFromServer");
    broadcastEmit({ type: "streamReq", payload: { source: "videoRecord" } });
  } else {
    voiceEmit(strings, id);
  }

  if (strings !== "STOP") {
    previousState.text = strings;
  }
};
