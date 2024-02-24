"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.receiveEnter = void 0;
const states_js_1 = require("../states.js");
const streamEmit_js_1 = require("../stream/streamEmit.js");
const cmdEmit_js_1 = require("./cmdEmit.js");
const stopEmit_js_1 = require("./stopEmit.js");
const splitSpace_js_1 = require("./splitSpace.js");
const splitPlus_js_1 = require("./splitPlus.js");
const sinewaveEmit_js_1 = require("./sinewaveEmit.js");
const sinewaveChange_js_1 = require("./sinewaveChange.js");
const parameterChange_js_1 = require("./parameterChange.js");
const voiceEmit_js_1 = require("./voiceEmit.js");
const chatPreparation_js_1 = require("../stream/chatPreparation.js");
const bpmCalc_js_1 = require("./bpmCalc.js");
// import { putString } from "./putString";
const recordEmit_js_1 = require("../stream/recordEmit.js");
const arduinoAccess_js_1 = require("../arduinoAccess/arduinoAccess.js");
const receiveEnter = (strings, id, io, state) => {
    //VOICE
    (0, voiceEmit_js_1.voiceEmit)(io, strings, state);
    /*
    if(strings === 'INSERT') {
      const result = postMongo()
    }
    */
    if (strings === "CHAT") {
        (0, chatPreparation_js_1.chatPreparation)(io, state);
    }
    else if (strings === "RECORD" || strings === "REC") {
        (0, recordEmit_js_1.recordEmit)(io, state);
        /*
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
        */
    }
    else if (strings.includes(" ") /*&& strings.split(" ").length < 4*/) {
        (0, splitSpace_js_1.splitSpace)(strings.split(" "), io, state);
    }
    else if (strings.includes("+")) {
        (0, splitPlus_js_1.splitPlus)(strings.split("+"), io, state);
    }
    else if (states_js_1.streamList.includes(strings)) {
        console.log("in stream");
        (0, streamEmit_js_1.streamEmit)(strings, io, state);
    }
    else if (Object.keys(states_js_1.cmdList).includes(strings)) {
        console.log("in cmd");
        (0, cmdEmit_js_1.cmdEmit)(states_js_1.cmdList[strings], io, state);
    }
    else if (Number.isFinite(Number(strings))) {
        console.log("sinewave");
        (0, sinewaveEmit_js_1.sinewaveEmit)(Number(strings), io, state);
    }
    else if (strings === "STOP") {
        console.log("stop");
        (0, stopEmit_js_1.stopEmit)(io, state, "ALL");
    }
    else if (strings === "QUANTIZE") {
        state.stream.quantize = !state.stream.quantize;
        for (let key in state.bpm) {
            const bar = (0, bpmCalc_js_1.millisecondsPerBar)(state.bpm[key]);
            const eighthNote = (0, bpmCalc_js_1.secondsPerEighthNote)(state.bpm[key]);
            io.to(key).emit("quantizeFromServer", {
                flag: state.stream.quantize,
                bpm: state.bpm[key],
                bar: bar,
                eighthNote: eighthNote,
            });
        }
    }
    else if (strings === "TWICE" || strings === "HALF") {
        (0, sinewaveChange_js_1.sinewaveChange)(strings, io, state);
        // } else if (strings === 'PREVIOUS' || strings === 'PREV') {
        // previousCmd(io, state)
    }
    else if (Object.keys(states_js_1.parameterList).includes(strings)) {
        (0, parameterChange_js_1.parameterChange)(states_js_1.parameterList[strings], io, state, { source: id });
    }
    else if (strings === "NO" || strings === "NUMBER") {
        state.client.forEach((id, index) => {
            console.log(id);
            io.to(id).emit("stringsFromServer", {
                strings: String(index),
                timeout: true,
            });
            //putString(io, String(index), state)
        });
        // 20230923 sinewave Clientの表示
        state.sinewaveClient.forEach((id, index) => {
            console.log(id);
            io.to(id).emit("stringsFromServer", {
                strings: String(index) + "(sinewave)",
                timeout: true,
            });
            //putString(io, String(index), state)
        });
    }
    else if (strings === "SWITCH") {
        const switchState = state.arduino.relay === "on" ? "OFF" : "ON";
        console.log(switchState);
        io.emit("stringsFromServer", {
            strings: "SWITCH " + switchState,
            timeout: true,
        });
        (0, arduinoAccess_js_1.switchCtrl)().then((result) => {
            console.log(result);
        });
    }
    else if (strings === "CLOCK") {
        /*
        state.clockMode = !state.clockMode;
        console.log(state.clockMode);
        io.to(id).emit("clockModeFromServer", { clockMode: state.clockMode });
        */
        io.emit("clockFromServer", {
            clock: true,
            // 暫定
            barLatency: state.stream.latency.CHAT * 4,
        });
    }
    if (strings !== "STOP") {
        state.previous.text = strings;
    }
};
exports.receiveEnter = receiveEnter;
//# sourceMappingURL=receiveEnter.js.map