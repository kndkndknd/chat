"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sinewaveEmit = void 0;
const putCmd_1 = require("./putCmd");
const notTargetEmit_1 = require("./notTargetEmit");
const sinewaveEmit = (frequencyStr, io, state, target) => {
    // サイン波の処理
    let cmd = {
        cmd: 'SINEWAVE',
        value: Number(frequencyStr),
        flag: true,
        fade: state.cmd.FADE.IN,
        portament: state.cmd.PORTAMENT,
        gain: state.cmd.GAIN.SINEWAVE
    };
    console.log(state.sinewaveMode);
    if (state.sinewaveMode) {
        let targetId = 'initial';
        state.sinewaveClientStatus.previous = state.sinewaveClientStatus.current;
        // どの端末も音を出していない場合
        if (Object.keys(state.sinewaveClientStatus.current).length === 0) {
            cmd.fade = state.cmd.FADE.IN;
            targetId = state.sinewaveClient[Math.floor(Math.random() * state.sinewaveClient.length)];
            console.log("debug: " + targetId);
            state.sinewaveClientStatus.current[targetId] = cmd.value;
            // state.previous.sinewave = {}
        }
        else {
            //同じ周波数の音を出している端末がある場合
            for (let id in state.sinewaveClientStatus.current) {
                if (cmd.value === state.sinewaveClientStatus.current[id]) {
                    targetId = id;
                    cmd.flag = false;
                    cmd.fade = state.cmd.FADE.IN;
                    delete state.sinewaveClientStatus.current[targetId];
                }
            }
            // 同じ周波数の音を出している端末がない場合
            if (targetId === 'initial') {
                for (let i = 0; i < state.sinewaveClient.length; i++) {
                    if (Object.keys(state.sinewaveClientStatus.current).includes(state.sinewaveClient[i])) {
                        continue;
                    }
                    else {
                        targetId = state.sinewaveClient[i];
                    }
                }
                if (targetId === 'initial') {
                    targetId = Object.keys(state.sinewaveClientStatus.current)[Math.floor(Math.random() * Object.keys(state.sinewaveClientStatus.current).length)];
                }
                state.sinewaveClientStatus.current[targetId] = cmd.value;
            }
        }
        console.log('only sinewave');
        console.log(state.sinewaveClientStatus.current);
        console.log(state.current.sinewave);
        console.log(targetId);
        // io.to(targetId).emit('cmdFromServer', cmd)
        (0, putCmd_1.putCmd)(io, targetId, cmd, state);
        //io.emit('cmdFromServer', cmd)
        (0, notTargetEmit_1.notTargetEmit)(targetId, state.sinewaveClient, io);
        // return
        return;
    }
    state.previous.sinewave = state.current.sinewave;
    let targetId = 'initial';
    if (target) {
        targetId = target;
        if (Object.keys(state.current.sinewave).includes(targetId)) {
            // 送信先が同じ周波数で音を出している場合
            if (state.current.sinewave[targetId] === cmd.value) {
                cmd.flag = false;
                cmd.fade = state.cmd.FADE.OUT;
                delete state.current.sinewave[targetId];
                // 送信先が違う周波数で音を出している場合
            }
            else {
                cmd.flag = true;
                cmd.fade = 0;
                state.current.sinewave[targetId] = cmd.value;
            }
        }
        else {
            // 送信先が音を出していない場合
            cmd.fade = state.cmd.FADE.IN;
            state.current.sinewave[targetId] = cmd.value;
        }
    }
    else {
        // どの端末も音を出していない場合
        if (Object.keys(state.current.sinewave).length === 0) {
            cmd.fade = state.cmd.FADE.IN;
            targetId = state.client[Math.floor(Math.random() * state.client.length)];
            console.log("debug: " + targetId);
            state.current.sinewave[targetId] = cmd.value;
            // state.previous.sinewave = {}
        }
        else {
            //同じ周波数の音を出している端末がある場合
            for (let id in state.current.sinewave) {
                if (cmd.value === state.current.sinewave[id]) {
                    targetId = id;
                    cmd.flag = false;
                    cmd.fade = state.cmd.FADE.OUT;
                    delete state.current.sinewave[targetId];
                }
            }
            // 同じ周波数の音を出している端末がない場合
            if (targetId === 'initial') {
                for (let i = 0; i < state.client.length; i++) {
                    if (Object.keys(state.current.sinewave).includes(state.client[i])) {
                        continue;
                    }
                    else {
                        targetId = state.client[i];
                    }
                }
                if (targetId === 'initial') {
                    targetId = Object.keys(state.current.sinewave)[Math.floor(Math.random() * Object.keys(state.current.sinewave).length)];
                }
                state.current.sinewave[targetId] = cmd.value;
            }
        }
    }
    console.log(state.current.sinewave);
    console.log(targetId);
    // io.to(targetId).emit('cmdFromServer', cmd)
    (0, putCmd_1.putCmd)(io, targetId, cmd, state);
    //io.emit('cmdFromServer', cmd)
    (0, notTargetEmit_1.notTargetEmit)(targetId, state.client, io);
};
exports.sinewaveEmit = sinewaveEmit;
//# sourceMappingURL=sinewaveEmit.js.map