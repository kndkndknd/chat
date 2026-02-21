import SocketIO from "socket.io";

import {
  cmdState,
  clientState,
  arduinoState,
  streamState,
  flagState,
  previousState,
  bpmStateDefault,
  bpmState,
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
import { putCmd } from "./putCmd";
import { cmdLogging } from "../logging/cmdLogging";
import { quantizeCmd } from "../stream/quantize";
import { mergeStreamTarget } from "../stream/mergeStreamTarget";
import { millisecondsPerBar } from "../../../util/bpmCalc";

import { execStream } from "../cmd/execStream";
import { execCmd } from "./execCmd";
import { changeCmdParam } from "./changeCmdParam";

export const receiveEnter = async (
  strings: string,
  id: string,
  io: SocketIO.Server,
  // state: cmdStateType
) => {
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
    execStream(strings, io, id);
  } else if (strings.includes(" ") /*&& strings.split(" ").length < 4*/) {
    splitSpace(strings.split(" "), io, id);
  } else if (strings.includes("+")) {
    splitPlus(strings.split("+"), io);
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
    execCmd(strings, io, id);
  } else if (strings === "STOP") {
    console.log("stop");
    voiceEmit(io, strings, id);
    stopEmit(io, id, "ALL");
    // io.emit("quantizeFromServer", quantizeObj[client].stream);
  } else if (
    Object.keys(parameterList).includes(strings) ||
    strings === "TWICE" ||
    strings === "HALF" ||
    strings === "FUSEJI" ||
    strings === "EMOJI"
  ) {
    changeCmdParam(strings, id, io);
  } else if (strings === "START" || strings === "SCENARIO") {
    const scenario = await loadScenario();
    await execScenario(scenario, io);
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
      voiceEmit(io, strings, "scenario");
    }
    stringEmit(io, strings, false);
  } else if (strings === "FLOATING") {
    streamState.floating = !streamState.floating;
    stringEmit(io, "FLOATING: " + streamState.floating, true);
  } else if (strings === "LATENCY") {
    putCmd(io, mergeStreamTarget(streamState), { cmd: "LATENCY" });
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
      stringEmit(io, "GET LIVESTREAM: SUCCESS");
    } else {
      stringEmit(io, "GET LIVESTREAM: FAILED");
    }
  } else if (strings === "CALL") {
    io.to(id).emit("webRtcOfferReqFromServer");
  } else if (strings === "VOSK") {
    console.log("VOSK CALL");
    io.emit("voskCallFromServer");
  } else {
    voiceEmit(io, strings, id);
  }

  if (strings !== "STOP") {
    previousState.text = strings;
  }
};
