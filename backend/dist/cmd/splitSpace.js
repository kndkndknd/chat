"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitSpace = void 0;
var states_1 = require("../states");
var cmdEmit_1 = require("./cmdEmit");
var upload_1 = require("../upload");
var sinewaveEmit_1 = require("./sinewaveEmit");
var parameterChange_1 = require("./parameterChange");
var putString_1 = require("./putString");
var insertStream_1 = require("../mongoAccess/insertStream");
var findStream_1 = require("../mongoAccess/findStream");
var splitSpace = function (stringArr, io, state) {
    var arrTypeArr = stringArr.map(function (string) {
        if (/^([1-9]\d*|0)(\.\d+)?$/.test(string)) {
            return 'number';
        }
        else if (/^[A-Za-z]*$/.test(string)) {
            return 'string';
        }
        else {
            return 'other';
        }
    });
    // console.log(arrTypeArr)
    // console.log(stringArr)
    if (arrTypeArr[0] === 'number' && stringArr.length === 2) {
        // 送信先を指定したコマンド/SINEWAVE
        var target = state.client[Number(stringArr[0])];
        console.log(target);
        if (arrTypeArr[1] === 'string') {
            (0, cmdEmit_1.cmdEmit)(stringArr[1], io, state, target);
        }
        else if (arrTypeArr[1] === 'number') {
            (0, sinewaveEmit_1.sinewaveEmit)(stringArr[1], io, state, target);
        }
    }
    else if (Object.keys(states_1.parameterList).includes(stringArr[0])) {
        // RANDOMのみRATEとSTREAMがあるので個別処理
        if (stringArr[0] === 'RANDOM') {
            if (stringArr[1] === 'RATE') {
                // SAMPLERATEのランダマイズ
                console.log('random rate');
                if (stringArr.length === 2) {
                    for (var key in state.stream.randomrate) {
                        state.stream.randomrate[key] = !state.stream.randomrate[key];
                    }
                    // io.emit('stringsFromServer',{strings: 'SAMPLERATE RANDOM: ' + String(state.stream.randomrate.CHAT), timeout: true})
                    (0, putString_1.putString)(io, 'SAMPLERATE RANDOM: ' + String(state.stream.randomrate.CHAT), state);
                }
                else if (stringArr.length === 3 && Object.keys(state.stream.randomrate).includes(stringArr[2])) {
                    state.stream.randomrate[stringArr[2]] = !state.stream.randomrate[stringArr[2]];
                    //io.emit('stringsFromServer',{strings: 'SAMPLERATE RANDOM(' + stringArr[2] + '): ' + String(state.stream.randomrate[stringArr[2]]), timeout: true})
                    (0, putString_1.putString)(io, 'SAMPLERATE RANDOM(' + stringArr[2] + '): ' + String(state.stream.randomrate[stringArr[2]]), state);
                }
                console.log(state.stream.randomrate);
            }
        }
        else if (stringArr[0] === 'VOICE') {
            //  } else if (stringArr[0] === 'VOICE' && stringArr.length === 2 && arrTypeArr[1] === 'string') {
            console.log('debt');
            if (stringArr[1] === "JA" || stringArr[1] === "JP") {
                state.cmd.voiceLang = 'ja-JP';
                (0, putString_1.putString)(io, 'VOICE: ja-JP', state);
            }
            else if (stringArr[1] === "EN" || stringArr[1] === "US") {
                state.cmd.voiceLang = 'en-US';
                (0, putString_1.putString)(io, 'VOICE: en-US', state);
            }
        }
        else {
            var argVal = void 0;
            var argProp = void 0;
            console.log(stringArr);
            console.log(arrTypeArr);
            if (stringArr.length === 2 && arrTypeArr[1] === 'number') {
                argVal = Number(stringArr[1]);
            }
            else if (stringArr.length === 2 && arrTypeArr[1] === 'string') {
                argProp = stringArr[1];
            }
            else if (stringArr.length === 3) {
                if (arrTypeArr[1] === 'string' && arrTypeArr[2] === 'number') {
                    argProp = stringArr[1];
                    argVal = Number(stringArr[2]);
                }
                else if (stringArr[0] === 'BPM' && arrTypeArr[1] === 'number' && arrTypeArr[2] === 'number') {
                    argProp = stringArr[1];
                    argVal = Number(stringArr[2]);
                }
            }
            (0, parameterChange_1.parameterChange)(states_1.parameterList[stringArr[0]], io, state, { value: argVal, property: argProp });
            (0, putString_1.putString)(io, stringArr[0] + ' ' + stringArr[1], state);
        }
    }
    else if (stringArr[0] === 'STOP') {
        if (stringArr.length === 2 && Object.keys(state.current.stream).includes(stringArr[1])) {
            state.current.stream[stringArr[1]] = false;
            (0, putString_1.putString)(io, stringArr[0] + ' ' + stringArr[1], state);
        }
    }
    else if (stringArr[0] === 'FADE') {
        if ((stringArr[1] === 'IN' || stringArr[1] === 'OUT') && stringArr.length === 2) {
            if (state.cmd.FADE[stringArr[1]] === 0) {
                state.cmd.FADE[stringArr[1]] = 5;
            }
            else {
                state.cmd.FADE[stringArr[1]] = 0;
            }
            // io.emit('stringsFromServer',{strings: 'FADE ' + stringArr[1] +  ': ' + String(state.cmd.FADE[stringArr[1]]), timeout: true})
            (0, putString_1.putString)(io, 'FADE ' + stringArr[1] + ': ' + String(state.cmd.FADE[stringArr[1]]), state);
        }
        else if (stringArr.length === 3 && (stringArr[1] === 'IN' || stringArr[1] === 'OUT') && arrTypeArr[2] === 'number') {
            if (state.cmd.FADE[stringArr[1]] !== Number(stringArr[2])) {
                state.cmd.FADE[stringArr[1]] = Number(stringArr[2]);
            }
            else {
                state.cmd.FADE[stringArr[1]] = 0;
            }
            (0, putString_1.putString)(io, 'FADE ' + stringArr[1] + ': ' + String(state.cmd.FADE[stringArr[1]]), state);
        }
    }
    else if (stringArr[0] === 'UPLOAD' && stringArr.length == 2) {
        (0, upload_1.uploadStream)(stringArr, io);
    }
    else if (stringArr[0] === 'GAIN' && stringArr.length === 3 && Object.keys(state.cmd.GAIN).includes(stringArr[1]) && arrTypeArr[2] === 'number') {
        state.cmd.GAIN[stringArr[1]] = Number(stringArr[2]);
        console.log(state.cmd.GAIN);
        (0, putString_1.putString)(io, stringArr[1] + ' GAIN: ' + stringArr[2], state);
    }
    else if (stringArr[0] === 'INSERT' && stringArr.length === 3 && Object.keys(states_1.streams).includes(stringArr[1])) {
        (0, insertStream_1.insertStream)(stringArr[1], stringArr[2], io);
    }
    else if (stringArr[0] === 'FIND' && stringArr.length === 3 && Object.keys(states_1.streams).includes(stringArr[1])) {
        (0, findStream_1.findStream)(stringArr[1], stringArr[2], io);
    }
};
exports.splitSpace = splitSpace;
//# sourceMappingURL=splitSpace.js.map