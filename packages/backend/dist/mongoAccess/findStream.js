"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findStream = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const states_1 = require("../states");
// import { stringEmit } from "../socket/ioEmit.js";
const pushStateStream_1 = require("../stream/pushStateStream");
dotenv_1.default.config();
const ipaddress = process.env.DB_HOST;
const findStream = async (key, value = "UNDEFINED", io) => {
    const queryParams = new URLSearchParams({
        name: "20230527",
        type: "PLAYBACK",
        location: "ftarri",
    });
    const res = fetch(`http://${ipaddress}:3030/find?${queryParams}`)
        .then((response) => response.body)
        .then((body) => {
        // const reader = body?.getReader();
        console.log(body);
    })
        .catch((error) => {
        console.error("Error:", error);
    });
    // .then(response => {
    //   const reader = response.body.getReader();
    // // })
    // const resBody = <ReadableStream<Uint8Array>>res.body;
    // const reader = resBody.pipeThrough(new TextDecoderStream()).getReader();
    // let i = 1;
    // let str = "";
    // const result: Array<streamInterface> = JSON.parse(str);
    // while (true) {
    //   const { done, value } = await reader.read();
    //   if (done) {
    //     const
    //     // const audio = new Float32Array(result[0].audio.buffer);
    //     // pushStream(result);
    //     // console.log(result[0].audio)
    //     console.log(i);
    //     return;
    //   }
    //   str = str + value;
    //   i++;
    // }
    //  console.log(res.length)
    // return res
};
exports.findStream = findStream;
const pushStream = (streamArray) => {
    const type = "FIND";
    // const type = streamArray[0].type
    states_1.streams[type] = {
        audio: [],
        video: [],
        index: 0,
        bufferSize: 8192,
    };
    streamArray.forEach((element, index) => {
        /*
        console.log(element.audio)
        console.log(element.audio.buffer)
        const audio = new Float32Array(element.audio.buffer)
        */
        const audio = new Uint8Array([...atob(element.audio)].map((c) => c.charCodeAt(0))).buffer;
        console.log(audio);
        // streams[type].audio.push(audio);
        states_1.streams[type].video.push(element.video);
        // streams[type].index.push(index);
    });
    console.log(states_1.streams[type].audio[0]);
    states_1.streamList.push(type);
    (0, pushStateStream_1.pushStateStream)(type, states_1.states);
};
//# sourceMappingURL=findStream.js.map