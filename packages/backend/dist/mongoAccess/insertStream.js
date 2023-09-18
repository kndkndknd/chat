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
const insertStream = async (type, io) => {
    if (type === "PLAYBACK") {
        await states_1.streams[type].forEach(async (stream) => {
            await setTimeout(async () => {
                const audio = btoa(String.fromCharCode(...new Uint8Array(stream.audio)));
                await postStream(type, stream.video, audio, io);
            }, 1000);
        });
        await io.emit("stringsFromServer", {
            strings: "INSERT DONE",
            timeout: true,
        });
    }
    else {
        states_1.streams[type].audio.forEach(async (audio, index) => {
            await setTimeout(async () => {
                const video = states_1.streams[type].video[index];
                const audioStr = btoa(String.fromCharCode(...new Uint8Array(audio)));
                await postStream(type, video, audioStr, io);
            }, 1000);
        });
        await io.emit("stringsFromServer", {
            strings: "INSERT DONE",
            timeout: true,
        });
    }
};
exports.insertStream = insertStream;
const postStream = async (type, video, audio, io) => {
    const body = {
        type: type,
        video: video,
        audio: audio,
    };
    const options = {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
            "Content-Type": "application/json",
        },
    };
    const res = await fetch("http://" + ipaddress + ":3000/insert", options);
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
};
//# sourceMappingURL=insertStream.js.map