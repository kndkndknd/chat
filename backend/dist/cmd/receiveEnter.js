"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.receiveEnter = void 0;
const states_1 = require("../states");
const stream_1 = require("../stream");
const cmdEmit_1 = require("../cmd/cmdEmit");
const stopEmit_1 = require("../cmd/stopEmit");
const splitSpace_1 = require("../cmd/splitSpace");
const sinewaveEmit_1 = require("../cmd/sinewaveEmit");
const sinewaveChange_1 = require("../cmd/sinewaveChange");
const parameterChange_1 = require("../cmd/parameterChange");
const voiceEmit_1 = require("../cmd/voiceEmit");
const previousCmd_1 = require("../cmd/previousCmd");
const receiveEnter = (strings, id, io, state) => {
    //VOICE
    (0, voiceEmit_1.voiceEmit)(io, strings, state);
    /*
    if(strings === 'INSERT') {
      const result = postMongo()
    }
    */
    if (strings === 'MACBOOK' || strings === 'THREE') {
        io.emit('threeSwitchFromServer', true);
    }
    else if (strings === 'CHAT') {
        console.log(state.current.stream.CHAT);
        if (!state.current.stream.CHAT) {
            console.log(state.client);
            state.current.stream.CHAT = true;
            const targetId = state.client[Math.floor(Math.random() * state.client.length)];
            io.to(targetId).emit('chatReqFromServer');
            if (state.cmd.VOICE.length > 0) {
                state.cmd.VOICE.forEach((element) => {
                    io.to(element).emit('voiceFromServer', 'CHAT');
                });
            }
        }
        else {
            state.current.stream.CHAT = false;
        }
    }
    else if (strings === "RECORD" || strings === "REC") {
        if (!state.current.RECORD) {
            state.current.RECORD = true;
            io.emit('recordReqFromServer', { target: 'PLAYBACK', timeout: 10000 });
            if (state.cmd.VOICE.length > 0) {
                state.cmd.VOICE.forEach((element) => {
                    //          io.to(element).emit('voiceFromServer', 'RECORD')
                    io.to(element).emit('voiceFromServer', { text: 'RECORD', lang: state.cmd.voiceLang });
                });
            }
        }
        else {
            state.current.RECORD = false;
        }
    }
    else if (strings.includes(' ') && strings.split(' ').length < 4) {
        (0, splitSpace_1.splitSpace)(strings.split(' '), io, state);
    }
    else if (states_1.streamList.includes(strings)) {
        console.log('in stream');
        state.current.stream[strings] = true;
        (0, stream_1.streamEmit)(strings, io, state);
    }
    else if (Object.keys(states_1.cmdList).includes(strings)) {
        console.log('in cmd');
        (0, cmdEmit_1.cmdEmit)(states_1.cmdList[strings], io, state);
    }
    else if (Number.isFinite(Number(strings))) {
        console.log('sinewave');
        (0, sinewaveEmit_1.sinewaveEmit)(strings, io, state);
    }
    else if (strings === 'TWICE' || strings === 'HALF') {
        (0, sinewaveChange_1.sinewaveChange)(strings, io, state);
    }
    else if (strings === 'PREVIOUS' || strings === 'PREV') {
        (0, previousCmd_1.previousCmd)(io, state);
    }
    else if (strings === 'STOP') {
        (0, stopEmit_1.stopEmit)(io, state);
    }
    else if (Object.keys(states_1.parameterList).includes(strings)) {
        (0, parameterChange_1.parameterChange)(states_1.parameterList[strings], io, state, { source: id });
    }
    else if (strings === 'NO' || strings === 'NUMBER') {
        state.client.forEach((id, index) => {
            console.log(id);
            io.to(id).emit('stringsFromServer', { strings: String(index), timeout: true });
            //putString(io, String(index), state)
        });
    }
};
exports.receiveEnter = receiveEnter;
//# sourceMappingURL=receiveEnter.js.map