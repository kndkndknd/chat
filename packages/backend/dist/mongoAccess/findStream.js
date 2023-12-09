"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findStream = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const states_1 = require("../states");
const upload_1 = require("../upload");
dotenv_1.default.config();
const ipaddress = process.env.DB_HOST;
const findStream = async (key, value = 'UNDEFINED', io) => {
    const queryParams = new URLSearchParams({
        [key]: value
    });
    const res = await fetch(`http://${ipaddress}:3000/api/stream?${queryParams}`);
    // .then(response => {
    //   const reader = response.body.getReader();
    // })
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let i = 1;
    let str = '';
    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            const result = JSON.parse(str);
            // const audio = new Float32Array(result[0].audio.buffer);
            pushStream(result);
            // console.log(result[0].audio)
            console.log(i);
            return;
        }
        str = str + value;
        i++;
    }
    //  console.log(res.length)
    // return res
};
exports.findStream = findStream;
const pushStream = (streamArray) => {
    const type = 'FIND';
    // const type = streamArray[0].type
    states_1.streams[type] = {
        audio: [],
        video: [],
        index: [],
        bufferSize: 8192
    };
    streamArray.forEach((element, index) => {
        /*
        console.log(element.audio)
        console.log(element.audio.buffer)
        const audio = new Float32Array(element.audio.buffer)
        */
        const audio = new Uint8Array([...atob(element.audio)].map(c => c.charCodeAt(0))).buffer;
        console.log(audio);
        states_1.streams[type].audio.push(audio);
        states_1.streams[type].video.push(element.video);
        states_1.streams[type].index.push(index);
    });
    console.log(states_1.streams[type].audio[0]);
    states_1.streamList.push(type);
    (0, upload_1.pushStateStream)(type, states_1.states);
};
//# sourceMappingURL=findStream.js.map