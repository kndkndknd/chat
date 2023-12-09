"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatReceive = exports.streamEmit = void 0;
const states_1 = require("./states");
const streamEmit = (source, io, state) => {
    // if(streams[source].length > 0) {
    console.log(state.client);
    const targetId = state.client[Math.floor(Math.random() * state.client.length)];
    let buff;
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
        let audioBuff = new Float32Array(states_1.basisBufferSize);
        for (let i = 0; i < states_1.basisBufferSize; i++) {
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
        const stream = {
            source: source,
            sampleRate: (state.stream.glitch[source] ? state.stream.glitchSampleRate : state.stream.sampleRate[source]),
            glitch: (state.stream.glitch[source] ? state.stream.glitch[source] : false),
            ...buff
        };
        if (state.stream.randomrate[source]) {
            stream.sampleRate = 11025 + Math.floor(Math.random() * 10) * 11025;
        }
        if (!stream.video)
            console.log("not video");
        if (!state.stream.grid[source]) {
            io.to(targetId).emit('streamFromServer', stream);
        }
        else {
            const timeOutVal = Math.round(Math.random() * 16) * states_1.states.stream.latency[source] / 4;
            setTimeout(() => {
                io.to(targetId).emit('streamFromServer', stream);
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
const chatReceive = (buffer, io) => {
    switch (buffer.target) {
        case 'CHAT':
            states_1.streams.CHAT.push(buffer);
            if (states_1.states.current.stream.CHAT) {
                const chunk = {
                    sampleRate: states_1.states.stream.sampleRate.CHAT,
                    glitch: states_1.states.stream.glitch.CHAT,
                    ...states_1.streams.CHAT.shift()
                };
                if (states_1.states.stream.randomrate.CHAT) {
                    chunk.sampleRate = 11025 + Math.floor(Math.random() * 10) * 11025;
                    //          console.log(chunk.sampleRate)
                }
                if (states_1.states.stream.glitch[buffer.target] && chunk.video) {
                    chunk.video = glitchStream(chunk.video);
                }
                console.log(states_1.states.client);
                const targetId = states_1.states.client[Math.floor(Math.random() * states_1.states.client.length)];
                console.log(targetId);
                if (!states_1.states.stream.grid[buffer.target]) {
                    io.to(targetId).emit('chatFromServer', chunk);
                }
                else {
                    const timeOutVal = Math.round(Math.random() * 16) * states_1.states.stream.latency.CHAT / 4;
                    setTimeout(() => {
                        io.to(targetId).emit('chatFromServer', chunk);
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
const glitchStream = (chunk) => {
    let rtnChunk = "data:image/jpeg;base64,";
    let baseImgString = chunk.split("data:image/jpeg;base64,")[1];
    let str = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    rtnChunk += baseImgString.replace(str[Math.floor(Math.random() * str.length)], str[Math.floor(Math.random() * str.length)]);
    return rtnChunk.replace(String(Math.floor(Math.random() + 10)), String(Math.floor(Math.random() + 10)));
};
//# sourceMappingURL=stream.js.map