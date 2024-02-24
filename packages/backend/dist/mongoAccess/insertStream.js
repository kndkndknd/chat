"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertStream = void 0;
const states_js_1 = require("../states.js");
// import { putString } from "../cmd/putString";
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const ipaddress = process.env.DB_HOST;
const insertStream = async (type, io, place, date) => {
    try {
        console.log(ipaddress);
        if (type === "PLAYBACK") {
            await states_js_1.streams[type].forEach(async (stream) => {
                await setTimeout(async () => {
                    const audio = btoa(String.fromCharCode(...new Uint8Array(stream.audio)));
                    if (place !== undefined && date !== undefined) {
                        await postStream(type, stream.video, audio, io, place, date);
                    }
                    else {
                        await postStream(type, stream.video, audio, io);
                    }
                }, 1000);
            });
            await io.emit("stringsFromServer", {
                strings: "INSERT DONE",
                timeout: true,
            });
        }
        else {
            states_js_1.streams[type].audio.forEach(async (audio, index) => {
                await setTimeout(async () => {
                    const video = states_js_1.streams[type].video[index];
                    const audioStr = btoa(String.fromCharCode(...new Uint8Array(audio)));
                    if (place !== undefined && date !== undefined) {
                        await postStream(type, video, audioStr, io, place, date);
                    }
                    else {
                        await postStream(type, video, audioStr, io);
                    }
                }, 1000);
            });
            await io.emit("stringsFromServer", {
                strings: "INSERT DONE",
                timeout: true,
            });
        }
    }
    catch (error) {
        console.log(error);
    }
};
exports.insertStream = insertStream;
const postStream = async (type, video, audio, io, place, date) => {
    const body = {
        type: type,
        video: video,
        audio: audio,
    };
    if (place !== undefined && date !== undefined) {
        body["place"] = place;
        body["date"] = date;
    }
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