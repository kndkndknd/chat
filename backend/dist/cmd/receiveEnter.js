"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.receiveEnter = void 0;
const states_1 = require("../states");
const streamEmit_1 = require("../stream/streamEmit");
const cmdEmit_1 = require("./cmdEmit");
const stopEmit_1 = require("./stopEmit");
const splitSpace_1 = require("./splitSpace");
const sinewaveEmit_1 = require("./sinewaveEmit");
const sinewaveChange_1 = require("./sinewaveChange");
const parameterChange_1 = require("./parameterChange");
const voiceEmit_1 = require("./voiceEmit");
const chatPreparation_1 = require("../stream/chatPreparation");
const bpmCalc_1 = require("./bpmCalc");
const receiveEnter = (strings, id, io, state) => {
    //VOICE
    (0, voiceEmit_1.voiceEmit)(io, strings, state);
    /*
    if(strings === 'INSERT') {
      const result = postMongo()
    }
    */
    if (strings === "CHAT") {
        (0, chatPreparation_1.chatPreparation)(io, state);
    }
    else if (strings === "RECORD" || strings === "REC") {
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
        }
        else {
            state.current.RECORD = false;
        }
    }
    else if (strings.includes(" ") && strings.split(" ").length < 4) {
        (0, splitSpace_1.splitSpace)(strings.split(" "), io, state);
    }
    else if (states_1.streamList.includes(strings)) {
        console.log("in stream");
        state.current.stream[strings] = true;
        (0, streamEmit_1.streamEmit)(strings, io, state);
    }
    else if (Object.keys(states_1.cmdList).includes(strings)) {
        console.log("in cmd");
        (0, cmdEmit_1.cmdEmit)(states_1.cmdList[strings], io, state);
    }
    else if (Number.isFinite(Number(strings))) {
        console.log("sinewave");
        (0, sinewaveEmit_1.sinewaveEmit)(strings, io, state);
    }
    else if (strings === "STOP") {
        (0, stopEmit_1.stopEmit)(io, state);
    }
    else if (strings === "QUANTIZE") {
        state.stream.quantize = !state.stream.quantize;
        for (let key in state.bpm) {
            const bar = (0, bpmCalc_1.millisecondsPerBar)(state.bpm[key]);
            const eighthNote = (0, bpmCalc_1.secondsPerEighthNote)(state.bpm[key]);
            io.to(key).emit('quantizeFromServer', {
                flag: state.stream.quantize,
                bpm: state.bpm[key],
                bar: bar,
                eighthNote: eighthNote
            });
        }
    }
    else if (strings === "TWICE" || strings === "HALF") {
        (0, sinewaveChange_1.sinewaveChange)(strings, io, state);
        // } else if (strings === 'PREVIOUS' || strings === 'PREV') {
        // previousCmd(io, state)
    }
    else if (Object.keys(states_1.parameterList).includes(strings)) {
        (0, parameterChange_1.parameterChange)(states_1.parameterList[strings], io, state, { source: id });
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
    }
    if (strings !== "STOP") {
        state.previous.text = strings;
    }
};
exports.receiveEnter = receiveEnter;
//# sourceMappingURL=receiveEnter.js.map