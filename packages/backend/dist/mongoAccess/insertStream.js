"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertStream = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const states_1 = require("../states");
const ioEmit_1 = require("../socket/ioEmit");
dotenv_1.default.config();
const ipaddress = process.env.DB_HOST;
const insertStream = async (type, io, place, date) => {
    try {
        console.log(ipaddress);
        // if (type === "PLAYBACK") {
        //   await streams[type].forEach(async (stream: buffStateType) => {
        //     await setTimeout(async () => {
        //       const audio = btoa(
        //         String.fromCharCode(...new Uint8Array(stream.audio))
        //       );
        //       // if (place !== undefined && date !== undefined) {
        //       await postStream(type, stream.video, audio, place, date);
        //       // } else {
        //       //   await postStream(type, stream.video, audio, io);
        //       // }
        //     }, 1000);
        //   });
        //   await io.emit("stringsFromServer", {
        //     strings: "INSERT DONE",
        //     timeout: true,
        //   });
        // } else {
        states_1.streams[type].audio.forEach(async (audio, index) => {
            await setTimeout(async () => {
                const video = states_1.streams[type].video[index];
                const audioStr = btoa(String.fromCharCode(...new Uint8Array(audio)));
                // if (place !== undefined && date !== undefined) {
                await postStream(type, video, audioStr, place, date);
                // } else {
                // await postStream(type, video, audioStr, io);
                // }
            }, 1000);
        });
        (0, ioEmit_1.stringEmit)(io, "INSERT DONE", true);
        // await io.emit("stringsFromServer", {
        //   strings: "INSERT DONE",
        //   timeout: true,
        // });
        // }
    }
    catch (error) {
        console.log(error);
        (0, ioEmit_1.stringEmit)(io, "INSERT ERROR", true);
    }
};
exports.insertStream = insertStream;
const postStream = async (type, video, audio, 
// io: SocketIO.Server,
place, date) => {
    const body = {
        type: type,
        video: video,
        audio: audio,
        location: place,
        name: date,
    };
    // if (place !== undefined && date !== undefined) {
    // body["location"] = place;
    // body["name"] = date;
    // }
    const options = {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
            "Content-Type": "application/json",
        },
    };
    try {
        const res = await fetch("http://" + ipaddress + ":3030/insert", options);
        if (res.body != null) {
            const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    console.log(value);
                    return;
                }
                // console.log(value);
            }
        }
    }
    catch (error) {
        console.log(error);
    }
};
//# sourceMappingURL=insertStream.js.map