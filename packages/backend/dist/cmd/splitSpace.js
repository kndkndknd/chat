"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitSpace = void 0;
const states_1 = require("../states");
const cmdEmit_1 = require("./cmdEmit");
const upload_1 = require("../upload");
const sinewaveEmit_1 = require("./sinewaveEmit");
const parameterChange_1 = require("./parameterChange");
const putCmd_1 = require("./putCmd");
const putString_1 = require("./putString");
const insertStream_1 = require("../mongoAccess/insertStream");
const timerCmd_1 = require("./timerCmd");
const stopEmit_1 = require("./stopEmit");
const targetStreamEmit_1 = require("../stream/targetStreamEmit");
const recordEmit_1 = require("../stream/recordEmit");
const arduinoAccess_1 = require("../arduinoAccess/arduinoAccess");
const splitSpace = (stringArr, io, state) => {
    const arrTypeArr = stringArr.map((string) => {
        if (/^([1-9]\d*|0)(\.\d+)?$/.test(string)) {
            return "number";
        }
        else if (/^[A-Za-z]*$/.test(string)) {
            return "string";
        }
        else {
            return "other";
        }
    });
    // console.log(arrTypeArr)
    // console.log(stringArr)
    if (arrTypeArr[0] === "number" && stringArr.length === 2) {
        // 送信先を指定したコマンド/SINEWAVE
        // 20230923 sinewave modeの動作を記載
        const target = state.client[Number(stringArr[0])];
        console.log(state.client);
        console.log(state.sinewaveClient);
        console.log(target);
        if (arrTypeArr[1] === "string" &&
            Object.keys(states_1.cmdList).includes(stringArr[1])) {
            (0, cmdEmit_1.cmdEmit)(stringArr[1], io, state, target);
        }
        else if (arrTypeArr[1] === "string" &&
            states_1.streamList.includes(stringArr[1])) {
            console.log("target stream");
            (0, targetStreamEmit_1.targetStreamEmit)(stringArr[1], io, state, target);
        }
        else if (stringArr[1] === "RECORD" || stringArr[1] === "REC") {
            (0, recordEmit_1.recordEmit)(io, state, target);
        }
        else if (arrTypeArr[1] === "number") {
            (0, sinewaveEmit_1.sinewaveEmit)(Number(stringArr[1]), io, state, target);
        }
    }
    else if (Object.keys(states_1.parameterList).includes(stringArr[0])) {
        // RANDOMのみRATEとSTREAMがあるので個別処理
        if (stringArr[0] === "RANDOM") {
            if (stringArr[1] === "RATE") {
                // SAMPLERATEのランダマイズ
                console.log("random rate");
                if (stringArr.length === 2) {
                    for (let key in state.stream.randomrate) {
                        state.stream.randomrate[key] = !state.stream.randomrate[key];
                    }
                    // io.emit('stringsFromServer',{strings: 'SAMPLERATE RANDOM: ' + String(state.stream.randomrate.CHAT), timeout: true})
                    (0, putString_1.putString)(io, "SAMPLERATE RANDOM: " + String(state.stream.randomrate.CHAT), state);
                }
                else if (stringArr.length === 3 &&
                    Object.keys(state.stream.randomrate).includes(stringArr[2])) {
                    state.stream.randomrate[stringArr[2]] =
                        !state.stream.randomrate[stringArr[2]];
                    //io.emit('stringsFromServer',{strings: 'SAMPLERATE RANDOM(' + stringArr[2] + '): ' + String(state.stream.randomrate[stringArr[2]]), timeout: true})
                    (0, putString_1.putString)(io, "SAMPLERATE RANDOM(" +
                        stringArr[2] +
                        "): " +
                        String(state.stream.randomrate[stringArr[2]]), state);
                }
                else if (stringArr.length === 3 && stringArr[2].includes("-")) {
                    const rateRangeArr = stringArr[2].split("-");
                    // rateRangeArrが2つの数字で構成されているか確認
                    if (rateRangeArr.length === 2 &&
                        rateRangeArr.every((item) => {
                            return !isNaN(Number(item));
                        })) {
                        for (let key in state.stream.randomraterange) {
                            state.stream.randomraterange[key].min = Number(rateRangeArr[0]);
                            state.stream.randomraterange[key].max = Number(rateRangeArr[1]);
                        }
                    }
                }
                else if (stringArr.length === 4 &&
                    Object.keys(state.stream.randomrate).includes(stringArr[2])) {
                    const rateRangeArr = stringArr[3].split("-");
                    if (rateRangeArr.length === 2 &&
                        rateRangeArr.every((item) => {
                            return !isNaN(Number(item));
                        })) {
                        state.stream.randomraterange[stringArr[2]].min = Number(rateRangeArr[0]);
                        state.stream.randomraterange[stringArr[2]].max = Number(rateRangeArr[1]);
                    }
                }
                else if (stringArr.length === 3 && stringArr[2] === "NOTE") {
                    for (let key in state.stream.randomratenote) {
                        state.stream.randomratenote[key] =
                            !state.stream.randomratenote[key];
                    }
                    // io.emit('stringsFromServer',{strings: 'SAMPLERATE RANDOM: ' + String(state.stream.randomrate.CHAT), timeout: true})
                    (0, putString_1.putString)(io, "SAMPLERATE RANDOM(NOTE): " +
                        String(state.stream.randomratenote.CHAT), state);
                }
                console.log(state.stream.randomrate);
            }
        }
        else if (stringArr[0] === "VOICE") {
            //  } else if (stringArr[0] === 'VOICE' && stringArr.length === 2 && arrTypeArr[1] === 'string') {
            console.log("debt");
            if (stringArr[1] === "JA" || stringArr[1] === "JP") {
                state.cmd.voiceLang = "ja-JP";
                (0, putString_1.putString)(io, "VOICE: ja-JP", state);
            }
            else if (stringArr[1] === "EN" || stringArr[1] === "US") {
                state.cmd.voiceLang = "en-US";
                (0, putString_1.putString)(io, "VOICE: en-US", state);
            }
        }
        else {
            let argVal;
            let argProp;
            console.log(stringArr);
            console.log(arrTypeArr);
            if (stringArr.length === 2 && arrTypeArr[1] === "number") {
                argVal = Number(stringArr[1]);
            }
            else if (stringArr.length === 2 && arrTypeArr[1] === "string") {
                argProp = stringArr[1];
            }
            else if (stringArr.length === 3) {
                if (arrTypeArr[1] === "string" && arrTypeArr[2] === "number") {
                    argProp = stringArr[1];
                    argVal = Number(stringArr[2]);
                }
                else if (stringArr[0] === "BPM" &&
                    arrTypeArr[1] === "number" &&
                    arrTypeArr[2] === "number") {
                    argProp = stringArr[1];
                    argVal = Number(stringArr[2]);
                }
            }
            (0, parameterChange_1.parameterChange)(states_1.parameterList[stringArr[0]], io, state, {
                value: argVal,
                property: argProp,
            });
            (0, putString_1.putString)(io, stringArr[0] + " " + stringArr[1], state);
        }
    }
    else if (stringArr[0] === "ALL") {
        if (arrTypeArr[1] === "string") {
            state.client.forEach((target) => {
                (0, cmdEmit_1.cmdEmit)(stringArr[1], io, state, target);
            });
        }
        else if (arrTypeArr[1] === "number") {
            state.client.forEach((target) => {
                (0, sinewaveEmit_1.sinewaveEmit)(Number(stringArr[1]), io, state, target);
            });
        }
    }
    else if (stringArr[0] === "STOP") {
        if (stringArr.length === 2 &&
            Object.keys(state.current.stream).includes(stringArr[1])) {
            state.previous.stream[stringArr[1]] = state.current.stream[stringArr[1]];
            state.current.stream[stringArr[1]] = false;
            (0, putString_1.putString)(io, stringArr[0] + " " + stringArr[1], state);
        }
        else if (stringArr.length === 2 && stringArr[1] === "STREAM") {
            state.previous.stream = state.current.stream;
            Object.keys(state.current.stream).forEach((key) => (state.current.stream[key] = false));
            (0, putString_1.putString)(io, stringArr[0] + " " + stringArr[1], state);
        }
        else if (stringArr.length === 2 &&
            Object.keys(state.current.cmd).includes(stringArr[1])) {
            state.previous.cmd[stringArr[1]] = state.current.cmd[stringArr[1]];
            state.current.cmd[stringArr[1]].forEach((cmdTarget) => {
                const cmd = {
                    cmd: cmdTarget,
                    flag: false,
                };
                if (stringArr[1] === "WHITENOISE" || stringArr[1] === "FEEDBACK") {
                    cmd.fade = state.cmd.FADE.OUT;
                }
                (0, putCmd_1.putCmd)(io, cmdTarget, cmd, state);
            });
            state.current.cmd[stringArr[1]] = [];
        }
        else if (stringArr.length === 2 && stringArr[1] === "SINEWAVE") {
            state.previous.sinewave = state.current.sinewave;
            Object.keys(state.current.sinewave).forEach((target) => {
                const sinewaveCmd = {
                    cmd: "SINEWAVE",
                    value: state.current.sinewave[target],
                    flag: false,
                    fade: state.cmd.FADE.IN,
                    portament: state.cmd.PORTAMENT,
                    gain: state.cmd.GAIN.SINEWAVE,
                };
                (0, putCmd_1.putCmd)(io, target, sinewaveCmd, state);
            });
            state.current.sinewave = {};
        }
        else if (stringArr.length === 2 && stringArr[1] === "CMD") {
            state.previous.cmd = state.current.cmd;
            state.previous.sinewave = state.current.sinewave;
            Object.keys(state.current.cmd).forEach((cmdTarget) => {
                state.current.cmd[cmdTarget].forEach((target) => {
                    const cmd = {
                        cmd: cmdTarget,
                        flag: false,
                    };
                    if (cmdTarget === "WHITENOISE" || cmdTarget === "FEEDBACK") {
                        cmd.fade = state.cmd.FADE.OUT;
                    }
                    (0, putCmd_1.putCmd)(io, target, cmd, state);
                    state.current.cmd[cmdTarget] = [];
                });
            });
            Object.keys(state.current.sinewave).forEach((key) => {
                const sinewaveCmd = {
                    cmd: "SINEWAVE",
                    value: state.current.sinewave[key],
                    flag: false,
                    fade: state.cmd.FADE.IN,
                    portament: state.cmd.PORTAMENT,
                    gain: state.cmd.GAIN.SINEWAVE,
                };
                (0, putCmd_1.putCmd)(io, key, sinewaveCmd, state);
            });
            state.current.sinewave = {};
        }
        else if (stringArr[1] === "ALL") {
            (0, stopEmit_1.stopEmit)(io, state, "ALL");
        }
    }
    else if (stringArr[0] === "FADE") {
        if ((stringArr[1] === "IN" || stringArr[1] === "OUT") &&
            stringArr.length === 2) {
            if (state.cmd.FADE[stringArr[1]] === 0) {
                state.cmd.FADE[stringArr[1]] = 5;
            }
            else {
                state.cmd.FADE[stringArr[1]] = 0;
            }
            // io.emit('stringsFromServer',{strings: 'FADE ' + stringArr[1] +  ': ' + String(state.cmd.FADE[stringArr[1]]), timeout: true})
            (0, putString_1.putString)(io, "FADE " + stringArr[1] + ": " + String(state.cmd.FADE[stringArr[1]]), state);
        }
        else if (stringArr.length === 3 &&
            (stringArr[1] === "IN" || stringArr[1] === "OUT") &&
            arrTypeArr[2] === "number") {
            if (state.cmd.FADE[stringArr[1]] !== Number(stringArr[2])) {
                state.cmd.FADE[stringArr[1]] = Number(stringArr[2]);
            }
            else {
                state.cmd.FADE[stringArr[1]] = 0;
            }
            (0, putString_1.putString)(io, "FADE " + stringArr[1] + ": " + String(state.cmd.FADE[stringArr[1]]), state);
        }
    }
    else if (stringArr[0] === "UPLOAD" && stringArr.length == 2) {
        (0, upload_1.uploadStream)(stringArr, io);
    }
    else if (stringArr[0] === "GAIN" &&
        stringArr.length === 3 &&
        Object.keys(state.cmd.GAIN).includes(stringArr[1]) &&
        arrTypeArr[2] === "number") {
        state.cmd.GAIN[stringArr[1]] = Number(stringArr[2]);
        console.log(state.cmd.GAIN);
        (0, putString_1.putString)(io, stringArr[1] + " GAIN: " + stringArr[2], state);
        // 動作確認用
        // } else if (stringArr[0] === 'FIND' && stringArr.length === 3) {
        // findStream(stringArr[1], stringArr[2], io);
    }
    else if (stringArr[0] === "INSERT" &&
        stringArr.length === 2 &&
        Object.keys(state.stream.sampleRate).includes(stringArr[1])) {
        (0, insertStream_1.insertStream)(stringArr[1], io);
    }
    else if (stringArr[0].includes(":")) {
        let timeStampArr = stringArr[0].split(":");
        if (timeStampArr.every((item) => {
            return !isNaN(Number(item));
        })) {
            (0, timerCmd_1.timerCmd)(io, state, stringArr, timeStampArr);
        }
    }
    else if (stringArr[0] === "SWITCH") {
        if (stringArr[1] === "TEST") {
            console.log("switch test");
            (0, arduinoAccess_1.connectTest)().then((result) => {
                console.log(result);
                states_1.states.arduino.connected = result;
                io.emit("stringsFromServer", {
                    strings: "SWITCH: " + String(states_1.states.arduino.connected),
                    timeout: true,
                });
            });
        }
        else if (stringArr[1] === "CRAMP") {
            (0, arduinoAccess_1.switchCramp)();
        }
    }
};
exports.splitSpace = splitSpace;
//# sourceMappingURL=splitSpace.js.map