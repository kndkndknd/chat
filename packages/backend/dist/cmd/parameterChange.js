"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parameterChange = void 0;
const putString_1 = require("./putString");
const states_1 = require("../states");
const putCmd_1 = require("./putCmd");
const parameterChange = (param, io, state, arg) => {
    switch (param) {
        case 'PORTAMENT':
            if (arg && arg.value && isFinite(Number(arg.value))) {
                state.cmd.PORTAMENT = arg.value;
            }
            else {
                if (state.cmd.PORTAMENT > 0) {
                    state.cmd.PORTAMENT = 0;
                }
                else {
                    state.cmd.PORTAMENT = 5;
                }
            }
            // io.emit('stringsFromServer',{strings: 'PORTAMENT: ' + String(state.cmd.PORTAMENT) + 'sec', timeout: true})
            (0, putString_1.putString)(io, 'PORTAMENT: ' + String(state.cmd.PORTAMENT) + 'sec', state);
            break;
        case 'SAMPLERATE':
            let sampleRate = 44100;
            if (arg && isFinite(Number(arg.value))) {
                sampleRate = arg.value;
            }
            else {
                const sampleArr = Object.values(state.stream.sampleRate);
                const sum = sampleArr.reduce((accumulator, currentValue) => {
                    return accumulator + currentValue;
                });
                const average = sum / sampleArr.length;
                if (average < 11025 || average >= 88200) {
                    sampleRate = 11025;
                }
                else if (average < 22050) {
                    sampleRate = 22050;
                }
                else if (average < 44100) {
                    sampleRate = 44100;
                }
                else {
                    sampleRate = 88200;
                }
            }
            if (arg && arg.property) {
                console.log('hit source');
                state.stream.sampleRate[arg.property] = sampleRate;
                // io.emit('stringsFromServer',{strings: 'SampleRate: ' + String(state.stream.sampleRate[arg.source]) + 'Hz', timeout: true})
                (0, putString_1.putString)(io, 'SampleRate: ' + String(state.stream.sampleRate[arg.property]) + 'Hz', state);
            }
            else {
                console.log(arg);
                for (let source in state.stream.sampleRate) {
                    state.stream.sampleRate[source] = sampleRate;
                }
                // io.emit('stringsFromServer',{strings: 'SampleRate: ' + String(state.stream.sampleRate.CHAT) + 'Hz', timeout: true})
                (0, putString_1.putString)(io, 'SampleRate: ' + String(state.stream.sampleRate.CHAT) + 'Hz', state);
            }
            break;
        case 'GLITCH':
            if (arg && arg.property) {
                state.stream.glitch[arg.source] = !state.stream.glitch[arg.source];
                // io.emit('stringsFromServer',{strings: 'GLITCH: ' + String(state.stream.glitch[arg.source]), timeout: true})
                (0, putString_1.putString)(io, 'GLITCH: ' + String(state.stream.glitch[arg.source]), state);
            }
            else {
                let flag = false;
                if (Object.values(states_1.states.stream.glitch).includes(false)) {
                    flag = true;
                }
                for (let source in state.stream.glitch) {
                    state.stream.glitch[source] = flag;
                }
                // io.emit('stringsFromServer',{strings: 'GLITCH: ' + String(state.stream.glitch.CHAT), timeout: true})
                (0, putString_1.putString)(io, 'GLITCH: ' + String(state.stream.glitch.CHAT), state);
            }
            break;
        case 'GRID':
            if (arg && arg.property) {
                state.stream.grid[arg.property] = !state.stream.grid[arg.property];
                // io.emit('stringsFromServer',{strings: 'GRID: ' + String(state.stream.grid[arg.property]) + '(' + arg.property + ')', timeout: true})
                (0, putString_1.putString)(io, 'GRID: ' + String(state.stream.grid[arg.property]) + '(' + arg.property + ')', state);
            }
            else {
                let flag = false;
                if (Object.values(states_1.states.stream.grid).includes(false)) {
                    flag = true;
                }
                for (let source in state.stream.grid) {
                    state.stream.grid[source] = flag;
                }
                // io.emit('stringsFromServer',{strings: 'GRID: ' + String(state.stream.grid.CHAT), timeout: true})
                (0, putString_1.putString)(io, 'GRID: ' + String(state.stream.grid.CHAT), state);
            }
            break;
        case 'BPM':
            if (arg && arg.value) {
                const latency = 60 * 1000 / arg.value;
                if (arg.property) {
                    // propertyがSTREAMを指定している場合
                    if (Object.keys(state.stream.latency).includes(arg.property)) {
                        state.stream.latency[arg.property] = latency;
                        (0, putString_1.putString)(io, 'BPM: ' + String(arg.value) + '(' + arg.property + ')', state);
                        // propertyが端末番号を指定している場合
                    }
                    else if (/^([1-9]\d*|0)(\.\d+)?$/.test(arg.property)) {
                        const target = state.client[Number(arg.property)];
                        if (Object.keys(state.cmd.METRONOME).includes(target)) {
                            state.cmd.METRONOME[target] = latency;
                            (0, putString_1.putString)(io, 'BPM: ' + String(arg.value) + '(client ' + arg.property + ')', state);
                        }
                        if (state.current.cmd.METRONOME.includes(target)) {
                            const cmd = {
                                cmd: 'METRONOME',
                                flag: true,
                                gain: state.cmd.GAIN.METRONOME,
                                value: latency
                            };
                            (0, putCmd_1.putCmd)(io, target, cmd, state);
                        }
                    }
                    // io.emit('stringsFromServer',{strings: 'BPM: ' + String(arg.value)  + '(' + arg.property + ')', timeout: true})
                }
                else {
                    for (let target in state.stream.latency) {
                        state.stream.latency[target] = latency;
                    }
                    for (let target in state.cmd.METRONOME) {
                        state.cmd.METRONOME[target] = latency;
                    }
                    if (state.current.cmd.METRONOME.length > 0) {
                        state.current.cmd.METRONOME.forEach((target) => {
                            const cmd = {
                                cmd: 'METRONOME',
                                flag: true,
                                gain: state.cmd.GAIN.METRONOME,
                                value: latency
                            };
                            (0, putCmd_1.putCmd)(io, target, cmd, state);
                        });
                    }
                    (0, putString_1.putString)(io, 'BPM: ' + String(arg.value), state);
                    // io.emit('stringsFromServer',{strings: 'BPM: ' + String(arg.value), timeout: true})
                }
            }
            break;
        case 'RANDOM':
            if (arg && arg.source) {
                state.stream.random[arg.source] = !state.stream.random[arg.source];
                // io.emit('stringsFromServer',{strings: 'RANDOM: ' + String(state.stream.random[arg.source]), timeout: true})
                (0, putString_1.putString)(io, 'RANDOM: ' + String(state.stream.random[arg.source]), state);
            }
            else {
                let flag = false;
                if (Object.values(states_1.states.stream.random).includes(false)) {
                    flag = true;
                }
                for (let target in state.stream.random) {
                    state.stream.random[target] = flag;
                }
                //io.emit('stringsFromServer',{strings: 'RANDOM: ' + String(state.stream.random.CHAT), timeout: true})
                (0, putString_1.putString)(io, 'RANDOM: ' + String(state.stream.random.CHAT), state);
            }
            break;
        case 'VOICE':
            if (arg && arg.source) {
                let flag = false;
                if (state.cmd.VOICE.includes(arg.source)) {
                    const arr = [];
                    for (let i = 0; i < state.cmd.VOICE.length; i++) {
                        if (state.cmd.VOICE[i] === arg.source) {
                            continue;
                        }
                        else {
                            arr.push(state.cmd.VOICE[i]);
                        }
                    }
                    state.cmd.VOICE = arr;
                    // state.cmd.VOICE.filter((id) => {
                    // })
                    console.log(state.cmd.VOICE);
                }
                else {
                    state.cmd.VOICE.push(arg.source);
                    flag = true;
                }
                // io.emit('stringsFromServer',{strings: 'VOICE: ' + String(flag), timeout: true})
                (0, putString_1.putString)(io, 'VOICE: ' + String(flag), state);
            }
            break;
    }
};
exports.parameterChange = parameterChange;
//# sourceMappingURL=parameterChange.js.map