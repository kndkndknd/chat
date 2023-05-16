"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertStream = void 0;
const states_1 = require("../states");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const ipaddress = process.env.DB_HOST;
const insertStream = async (name, type, location = 'UNDEFINED', io) => {
    // const streamChunk = streams[type].shift();
    states_1.streams[type].forEach(async (streamChunk) => {
        // const uint8Array = new Uint8Array(streamChunk.audio.buffer)
        const body = {
            'name': name,
            'type': type,
            'video': streamChunk.video,
            'location': location
        };
        const jsonBlob = new Blob([JSON.stringify(body)]);
        const audioBlob = new Blob([streamChunk.audio]);
        // const jsonBlob = new Blob([JSON.stringify(body)], {type : 'application/json'})
        // const audioBlob = new Blob([streamChunk.audio], {type : 'application/octet-stream'})
        const formData = new FormData();
        formData.append('json', jsonBlob);
        formData.append('binary', audioBlob);
        const options = {
            method: 'POST',
            body: formData,
        };
        /*
        const options = {
          method: 'POST',
          body: JSON.stringify(body),
          headers: {
            'Content-Type': 'application/json'
          }
        }
        */
        // console.log(body.audio)
        const res = await fetch('http://' + ipaddress + ':3000/api/stream', options);
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                return;
            // console.log(value);
        }
    });
    await io.emit('stringsFromServer', { strings: 'INSERT DONE', timeout: true });
    // return res
};
exports.insertStream = insertStream;
//# sourceMappingURL=insertStream.js.map