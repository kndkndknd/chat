"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatReceive = exports.streamEmit = void 0;
var states_1 = require("./states");
var streamEmit = function (source, io, state) {
    // if(streams[source].length > 0) {
    console.log(state.client);
    var targetId = state.client[Math.floor(Math.random() * state.client.length)];
    var buff;
    if (source === 'PLAYBACK') {
        if (states_1.streams[source].length > 0) {
            if (!state.stream.random[source]) {
                buff = states_1.streams[source].shift();
                states_1.streams[source].push(buff);
            }
            else {
                // RANDOM
                buff = states_1.streams[source][Math.floor(Math.random() * states_1.streams[source].length)];
            }
        }
        else {
            io.emit('stringsFromServer', { strings: "NO BUFFER", timeout: true });
        }
    }
    else if (source === 'EMPTY') {
        var audioBuff = new Float32Array(states_1.basisBufferSize);
        for (var i = 0; i < states_1.basisBufferSize; i++) {
            audioBuff[i] = 1.0;
        }
        buff = {
            target: source,
            bufferSize: states_1.basisBufferSize,
            audio: audioBuff,
            video: states_1.streams[source].video.shift(),
            duration: states_1.basisBufferSize / 44100
        };
        /*
      } else if(source === 'TIMELAPSE') {
        if(streams.TIMELAPSE.audio.length > 0 && streams.TIMELAPSE.video.length > 0) {
          buff = {
            target: source,
            bufferSize: streams[source].bufferSize,
            audio: streams[source].audio.shift(),
            video: streams[source].video.shift(),
            duration: streams[source].bufferSize / 44100
          }
        }
        */
    }
    else {
        if (states_1.streams[source].audio.length > 0 || states_1.streams[source].video.length > 0) {
            if (!state.stream.random[source]) {
                buff = {
                    target: source,
                    bufferSize: states_1.streams[source].bufferSize,
                    audio: states_1.streams[source].audio.shift(),
                    video: states_1.streams[source].video.shift(),
                    duration: states_1.streams[source].bufferSize / 44100
                };
                states_1.streams[source].audio.push(buff.audio);
                states_1.streams[source].video.push(buff.video);
            }
            else {
                buff = {
                    target: source,
                    bufferSize: states_1.streams[source].bufferSize,
                    audio: states_1.streams[source].audio[Math.floor(Math.random() * states_1.streams[source].audio.length)],
                    video: states_1.streams[source].video[Math.floor(Math.random() * states_1.streams[source].video.length)],
                    duration: states_1.streams[source].bufferSize / 44100
                };
            }
        }
        else {
            io.emit('stringsFromServer', { strings: "NO BUFFER", timeout: true });
        }
    }
    if (buff) {
        var stream_1 = __assign({ source: source, sampleRate: (state.stream.glitch[source] ? state.stream.glitchSampleRate : state.stream.sampleRate[source]), glitch: (state.stream.glitch[source] ? state.stream.glitch[source] : false) }, buff);
        if (state.stream.randomrate[source]) {
            stream_1.sampleRate = 11025 + Math.floor(Math.random() * 10) * 11025;
        }
        if (!stream_1.video)
            console.log("not video");
        if (!state.stream.grid[source]) {
            io.to(targetId).emit('streamFromServer', stream_1);
        }
        else {
            var timeOutVal = Math.round(Math.random() * 16) * states_1.states.stream.latency[source] / 4;
            setTimeout(function () {
                io.to(targetId).emit('streamFromServer', stream_1);
            }, timeOutVal);
        }
    }
    else {
        console.log('no buffer');
    }
    /*
  } else {
    io.emit('stringsFromServer',{strings: "NO BUFFER", timeout: true})
  }
  */
};
exports.streamEmit = streamEmit;
var chatReceive = function (buffer, io) {
    switch (buffer.target) {
        case 'CHAT':
            states_1.streams.CHAT.push(buffer);
            if (states_1.states.current.stream.CHAT) {
                var chunk_1 = __assign({ sampleRate: states_1.states.stream.sampleRate.CHAT, glitch: states_1.states.stream.glitch.CHAT }, states_1.streams.CHAT.shift());
                if (states_1.states.stream.randomrate.CHAT) {
                    chunk_1.sampleRate = 11025 + Math.floor(Math.random() * 10) * 11025;
                    //          console.log(chunk.sampleRate)
                }
                if (states_1.states.stream.glitch[buffer.target] && chunk_1.video) {
                    chunk_1.video = glitchStream(chunk_1.video);
                }
                console.log(states_1.states.client);
                var targetId_1 = states_1.states.client[Math.floor(Math.random() * states_1.states.client.length)];
                console.log(targetId_1);
                if (!states_1.states.stream.grid[buffer.target]) {
                    io.to(targetId_1).emit('chatFromServer', chunk_1);
                }
                else {
                    var timeOutVal = Math.round(Math.random() * 16) * states_1.states.stream.latency.CHAT / 4;
                    setTimeout(function () {
                        io.to(targetId_1).emit('chatFromServer', chunk_1);
                    }, timeOutVal);
                }
            }
            else {
                io.emit('erasePrintFromServer');
            }
            break;
        case 'PLAYBACK': //RECORDコマンドからのチャンク受信
            states_1.streams.PLAYBACK.push(buffer);
            console.log('PLAYBACK.length:' + String(states_1.streams.PLAYBACK.length));
            break;
        case 'TIMELAPSE':
            states_1.streams.TIMELAPSE.audio.push(buffer.audio);
            states_1.streams.TIMELAPSE.video.push(buffer.video);
            // console.log(buffer.audio)
            console.log('TIMELAPSE.length:' + String(states_1.streams.TIMELAPSE.audio.length));
            break;
    }
};
exports.chatReceive = chatReceive;
var glitchStream = function (chunk) {
    var rtnChunk = "data:image/jpeg;base64,";
    var baseImgString = chunk.split("data:image/jpeg;base64,")[1];
    var str = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    rtnChunk += baseImgString.replace(str[Math.floor(Math.random() * str.length)], str[Math.floor(Math.random() * str.length)]);
    return rtnChunk.replace(String(Math.floor(Math.random() + 10)), String(Math.floor(Math.random() + 10)));
};
//# sourceMappingURL=stream.js.map