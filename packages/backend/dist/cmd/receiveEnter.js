"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.receiveEnter = void 0;
const states_1 = require("../states");
const streamEmit_1 = require("../stream/streamEmit");
const cmdEmit_1 = require("./cmdEmit");
const stopEmit_1 = require("./stopEmit");
const splitSpace_1 = require("./splitSpace/splitSpace");
const splitPlus_1 = require("./splitPlus");
const sinewaveEmit_1 = require("./sinewaveEmit");
const sinewaveChange_1 = require("./sinewaveChange");
const parameterChange_1 = require("./parameterChange");
const voiceEmit_1 = require("./voiceEmit");
const chatPreparation_1 = require("../stream/chatPreparation");
const bpmCalc_1 = require("./bpmCalc");
// import { putString } from "./putString";
const recordEmit_1 = require("../stream/recordEmit");
const arduinoAccess_1 = require("../arduinoAccess/arduinoAccess");
const ioEmit_1 = require("../socket/ioEmit");
const previousCmd_1 = require("./previousCmd");
const getLiveStream_1 = require("../stream/getLiveStream");
const loadScenario_1 = require("../scenario/loadScenario");
const execScenario_1 = require("../scenario/execScenario");
const putCmd_1 = require("./putCmd");
const receiveEnter = async (strings, id, io, state) => {
    //VOICE
    // if (strings.includes("VOICE ")) {
    // voiceEmit(io, strings, id, state);
    // }
    /*
    if(strings === 'INSERT') {
      const result = postMongo()
    }
    */
    if (strings === "CHAT") {
        (0, chatPreparation_1.chatPreparation)(io, state);
        (0, voiceEmit_1.voiceEmit)(io, strings, id, state);
    }
    else if (strings === "RECORD" || strings === "REC") {
        (0, recordEmit_1.recordEmit)(io, state);
        (0, voiceEmit_1.voiceEmit)(io, "RECORD", id, state);
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
        (0, splitSpace_1.splitSpace)(strings.split(" "), io, state, id);
    }
    else if (strings.includes("+")) {
        (0, splitPlus_1.splitPlus)(strings.split("+"), io, state);
    }
    else if (states_1.streamList.includes(strings)) {
        console.log("in stream");
        (0, streamEmit_1.streamEmit)(strings, io, state);
        (0, voiceEmit_1.voiceEmit)(io, strings, id, state);
    }
    else if (Object.keys(states_1.cmdList).includes(strings)) {
        console.log("in cmd");
        (0, voiceEmit_1.voiceEmit)(io, states_1.cmdList[strings], id, state);
        (0, cmdEmit_1.cmdEmit)(states_1.cmdList[strings], io, state);
    }
    else if (Number.isFinite(Number(strings))) {
        console.log("sinewave");
        (0, voiceEmit_1.voiceEmit)(io, strings + "Hz", id, state);
        (0, sinewaveEmit_1.sinewaveEmit)(Number(strings), io, state);
    }
    else if (strings === "SINEWAVE") {
        const frequency = 20 + Math.random() * 19980;
        (0, voiceEmit_1.voiceEmit)(io, frequency + "Hz", id, state);
        (0, sinewaveEmit_1.sinewaveEmit)(frequency, io, state);
    }
    else if (strings === "STOP") {
        console.log("stop");
        (0, voiceEmit_1.voiceEmit)(io, strings, id, state);
        (0, stopEmit_1.stopEmit)(io, state, id, "ALL");
    }
    else if (strings === "QUANTIZE") {
        if (Object.keys(state.stream.quantize).length >
            Object.keys(state.client).length / 2) {
            for (let key in state.stream.quantize) {
                delete state.stream.quantize[key];
            }
            for (let key in state.bpm) {
                const bar = (0, bpmCalc_1.millisecondsPerBar)(state.bpm[key]);
                io.emit("quantizeFromServer", {
                    flag: false,
                    bpm: state.bpm[key],
                    bar: bar,
                    beat: 1,
                });
            }
        }
        else {
            for (let key in state.client) {
                if (state.stream.quantize[key] === undefined) {
                    // 1~7の整数をランダムで生成
                    // state.stream.quantize[key] = Math.floor(Math.random() * 6) + 1;
                    state.stream.quantize[key] = 4;
                }
            }
            // state.stream.quantize = !state.stream.quantize;
            console.log("state.bpm", state.bpm);
            for (let key in state.bpm) {
                const bar = (0, bpmCalc_1.millisecondsPerBar)(state.bpm[key]);
                // const eighthNote = secondsPerEighthNote(state.bpm[key]);
                console.log("quantize bar", bar);
                io.to(key).emit("quantizeFromServer", {
                    flag: true,
                    bpm: state.bpm[key],
                    bar: bar,
                    beat: state.stream.quantize[key],
                });
            }
        }
    }
    else if (strings === "TWICE" || strings === "HALF") {
        (0, sinewaveChange_1.sinewaveChange)(strings, io, state);
    }
    else if (strings === "PREVIOUS" || strings === "PREV") {
        (0, voiceEmit_1.voiceEmit)(io, "PREVIOUS", id, state);
        (0, previousCmd_1.previousCmd)(io, state);
    }
    else if (Object.keys(states_1.parameterList).includes(strings)) {
        (0, parameterChange_1.parameterChange)(states_1.parameterList[strings], io, state, { source: id });
    }
    else if (strings === "NO" || strings === "NUMBER") {
        Object.keys(state.client).forEach((id, index) => {
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
        (0, arduinoAccess_1.switchCtrl)().then((result) => {
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
    else if (strings === "FUSEJI" || strings === "EMOJI") {
        state.emoji = !state.emoji;
        io.emit("emojiFromServer", {
            state: state.emoji,
            text: "Emoji " + state.emoji,
        });
        // stringEmit(io, "EMOJI " + state.emoji, true);
        /*
      } else if (strings === "LIVESTREAM" || strings === "SOMEWHERE") {
        //仮
        const liveStreamUrl = "https://www.showroom-live.com/r/officialJKT48";
        getLiveBuffer(liveStreamUrl).then((buffer) => {
          try {
            // 仮
            console.log("emitBuffer", buffer);
            io.emit("bufferFromServer", buffer);
          } catch (err) {
            console.error(err);
          }
        });
    */
    }
    else if (strings === "START" || strings === "SCENARIO") {
        const scenario = await (0, loadScenario_1.loadScenario)();
        await (0, execScenario_1.execScenario)(scenario, io);
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
    }
    else if (id === "scenario") {
        console.log("scenario", strings);
        if (state.cmd.VOICE.length > 0) {
            console.log("voiceEmit scenario");
            (0, voiceEmit_1.voiceEmit)(io, strings, "scenario", state);
        }
        (0, ioEmit_1.stringEmit)(io, strings, false);
    }
    else if (strings === "SOLFEGGIO") {
        const solfeggioArr = [285, 396, 417, 528, 639, 741, 852, 963];
        const frequency = solfeggioArr[Math.floor(Math.random() * solfeggioArr.length)];
        (0, sinewaveEmit_1.sinewaveEmit)(frequency, io, state);
    }
    else if (strings === "FLOATING") {
        state.stream.floating = !state.stream.floating;
        (0, ioEmit_1.stringEmit)(io, "FLOATING: " + state.stream.floating, true);
    }
    else if (strings === "LATENCY") {
        (0, putCmd_1.putCmd)(io, Object.keys(state.client), { cmd: "LATENCY" }, state);
    }
    else if (strings === "TWITCASTING" ||
        strings === "TWICAS" ||
        strings === "TWITCAS") {
        const qWord = "TWITCASTING";
        console.log("qWord", qWord);
        const result = await (0, getLiveStream_1.getLiveStream)("LIVESTREAM", qWord);
        console.log("get livestream", result);
        if (result) {
            (0, ioEmit_1.stringEmit)(io, "GET LIVESTREAM: SUCCESS");
        }
        else {
            (0, ioEmit_1.stringEmit)(io, "GET LIVESTREAM: FAILED");
        }
    }
    else {
        (0, voiceEmit_1.voiceEmit)(io, strings, id, state);
    }
    if (strings !== "STOP") {
        state.previous.text = strings;
    }
};
exports.receiveEnter = receiveEnter;
//# sourceMappingURL=receiveEnter.js.map