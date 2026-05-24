"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.receiveEnter = void 0;
const ioState_1 = require("../state/states/ioState");
const state_1 = require("../state");
const data_1 = require("../data");
const stopEmit_1 = require("./stopEmit");
const splitSpace_1 = require("./splitSpace");
const splitPlus_1 = require("./splitPlus");
const voiceEmit_1 = require("./voiceEmit");
const ioEmit_1 = require("../socket/ioEmit");
const getLiveStream_1 = require("../stream/getLiveStream");
const loadScenario_1 = require("../scenario/loadScenario");
const execScenario_1 = require("../scenario/execScenario");
const scenarioItsuki_1 = require("../scenario/scenarioItsuki");
const putCmd_1 = require("./putCmd");
const cmdLogging_1 = require("../logging/cmdLogging");
const mergeStreamTarget_1 = require("../stream/mergeStreamTarget");
const execStream_1 = require("../cmd/execStream");
const execCmd_1 = require("./execCmd");
const changeCmdParam_1 = require("./changeCmdParam");
const wholeEmit_1 = require("../stream/wholeEmit");
const weriftClient_1 = require("../webRTC/weriftClient");
const cameraRotator_1 = require("../webRTC/cameraRotator");
const receiveEnter = async (strings, id) => {
    console.log("receiveEnter", strings, id);
    if (strings === undefined || strings === null) {
        return;
    }
    console.log("flagState.scenario", state_1.flagState.scenario);
    if (!state_1.flagState.scenario || strings === "REPLAY") {
        console.log("logging in receiveEnter");
        (0, cmdLogging_1.cmdLogging)(strings);
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
        const clientIds = Object.keys(state_1.clientState.client).sort((a, b) => state_1.clientState.client[a].number - state_1.clientState.client[b].number);
        const messages = ["chat", "(async)"];
        clientIds.forEach((cid, idx) => {
            (0, ioEmit_1.stringEmit)(messages[idx] ?? "", false, cid);
        });
    }
    else if (strings === "CHAT" ||
        strings === "RECORD" ||
        strings === "REC" ||
        data_1.streamList.includes(strings)) {
        (0, execStream_1.execStream)(strings, id);
    }
    else if (strings.includes(" ") /*&& strings.split(" ").length < 4*/) {
        (0, splitSpace_1.splitSpace)(strings.split(" "), id);
    }
    else if (strings.includes("+")) {
        (0, splitPlus_1.splitPlus)(strings.split("+"));
    }
    else if (Object.keys(data_1.cmdList).includes(strings) ||
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
        strings === "BLINK") {
        (0, execCmd_1.execCmd)(strings, id);
    }
    else if (strings === "STOP") {
        console.log("stop");
        (0, voiceEmit_1.voiceEmit)(strings, id);
        (0, stopEmit_1.stopEmit)("ALL");
        // io.emit("quantizeFromServer", quantizeObj[client].stream);
    }
    else if (Object.keys(data_1.parameterList).includes(strings) ||
        strings === "TWICE" ||
        strings === "HALF" ||
        strings === "FUSEJI" ||
        strings === "EMOJI") {
        (0, changeCmdParam_1.changeCmdParam)(strings, id);
    }
    else if (strings === "START" || strings === "SCENARIO") {
        const scenario = await (0, loadScenario_1.loadScenario)();
        await (0, execScenario_1.execScenario)(scenario);
    }
    else if (strings === "SCENARIOITSUKI") {
        await (0, scenarioItsuki_1.scenarioItsuki)();
    }
    else if (id === "scenario") {
        console.log("scenario", strings);
        if (state_1.cmdState.VOICE.length > 0) {
            console.log("voiceEmit scenario");
            (0, voiceEmit_1.voiceEmit)(strings, "scenario");
        }
        (0, ioEmit_1.stringEmit)(strings, false);
    }
    else if (strings === "FLOATING") {
        state_1.streamState.floating = !state_1.streamState.floating;
        (0, ioEmit_1.stringEmit)("FLOATING: " + state_1.streamState.floating, true);
    }
    else if (strings === "LATENCY") {
        (0, putCmd_1.putCmd)((0, mergeStreamTarget_1.mergeStreamTarget)(state_1.streamState), { cmd: "LATENCY" });
    }
    else if (strings === "TWITCASTING" ||
        strings === "TWICAS" ||
        strings === "TWITCAS") {
        const qWord = "TWITCASTING";
        console.log("qWord", qWord);
        const result = await (0, getLiveStream_1.getLiveStream)("LIVESTREAM", qWord);
        console.log("get livestream", result);
        if (result) {
            (0, ioEmit_1.stringEmit)("GET LIVESTREAM: SUCCESS");
        }
        else {
            (0, ioEmit_1.stringEmit)("GET LIVESTREAM: FAILED");
        }
    }
    else if (strings === "CALL") {
        (0, weriftClient_1.startWebRTCSession)();
        // 接続中の全クライアントを 20 秒ごとにローテーションして送信元にする。
        // (受信側パイプラインは werift recv recorder のままで 1 系統。)
        (0, cameraRotator_1.startCameraRotation)();
    }
    else if (strings === "STOPWEBRTC") {
        // ローテーションを止めてから webRTC セッション全体を停止する。
        (0, cameraRotator_1.stopCameraRotation)();
        (0, weriftClient_1.stopWebRTCSession)();
        console.log("[STOPWEBRTC] werift session stop requested");
    }
    else if (strings === "VOSK") {
        console.log("VOSK CALL");
        ioState_1.ioState?.io.emit("voskCallFromServer");
    }
    else if (strings === "WHOLE") {
        if (state_1.currentState.WHOLE) {
            state_1.currentState.WHOLE = false;
            (0, ioEmit_1.stringEmit)("WHOLE CMD STOP", true);
        }
        else {
            state_1.currentState.WHOLE = true;
            (0, wholeEmit_1.wholeEmit)();
            // stringEmit(io, "WHOLE CMD", true);
        }
    }
    else {
        (0, voiceEmit_1.voiceEmit)(strings, id);
    }
    if (strings !== "STOP") {
        state_1.previousState.text = strings;
    }
};
exports.receiveEnter = receiveEnter;
//# sourceMappingURL=receiveEnter.js.map