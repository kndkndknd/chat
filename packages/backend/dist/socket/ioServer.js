"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ioServer = void 0;
const socket_io_1 = require("socket.io");
// import { statusList, pathList, statusClient } from "../statusList";
const chatReceive_js_1 = require("../stream/chatReceive.js");
// import {
//   selectOtherClient,
//   roomEmit,
//   pickupTarget,
//   pickCmdTarget,
//   cmdSelect,
// } from "../route";
// import { cmdEmit } from "../cmd/cmdEmit";
const charProcess_js_1 = require("../cmd/charProcess.js");
// import { stopEmit } from "../cmd/stopEmit";
// import { sinewaveEmit } from "../cmd/sinewaveEmit";
const streamEmit_js_1 = require("../stream/streamEmit.js");
const states_js_1 = require("../states.js");
// import { DefaultEventsMap } from "socket.io/dist/typed-events";
let strings = "";
const previousFace = { x: 0, y: 0 };
const ioServer = (httpserver) => {
    const io = new socket_io_1.Server(httpserver, {
        path: "/socket.io",
    });
    io.sockets.on("connection", (socket) => {
        socket.on("connectFromClient", (data) => {
            let sockId = String(socket.id);
            if (data === "client") {
                if (!states_js_1.states.stream.timelapse)
                    states_js_1.states.stream.timelapse = true;
                console.log('socket.on("connectFromClient", (data) => {data:' +
                    data +
                    ", id:" +
                    sockId +
                    "}");
                if (!states_js_1.states.client.includes(sockId))
                    states_js_1.states.client.push(sockId);
                states_js_1.states.client = states_js_1.states.client.filter((id) => {
                    //console.log(io.sockets.adapter.rooms.has(id))
                    if (io.sockets.adapter.rooms.has(id)) {
                        return id;
                    }
                });
                // METRONOMEは接続時に初期値を作る
                states_js_1.states.cmd.METRONOME[sockId] = 1000;
            }
            else if (data === "sinewaveClient") {
                console.log(sockId + " is sinewaveClient");
                if (!states_js_1.states.sinewaveClient.includes(sockId))
                    states_js_1.states.sinewaveClient.push(sockId);
                states_js_1.states.sinewaveClient = states_js_1.states.sinewaveClient.filter((id) => {
                    //console.log(io.sockets.adapter.rooms.has(id))
                    if (io.sockets.adapter.rooms.has(id)) {
                        return id;
                    }
                });
            }
            console.log(states_js_1.states.client);
            console.log(states_js_1.states.sinewaveClient);
            socket.emit("debugFromServer");
        });
        socket.on("charFromClient", (character) => {
            console.log("socket.id: " + String(socket.id));
            console.log("client: " + states_js_1.states.client);
            strings = (0, charProcess_js_1.charProcess)(character, strings, socket.id, io, states_js_1.states);
        });
        socket.on("chatFromClient", (buffer) => {
            // console.log("debug chatFromClient", states.current.stream);
            // console.log("socket.id: " + String(socket.id));
            if (buffer.from === undefined)
                buffer.from = String(socket.id);
            (0, chatReceive_js_1.chatReceive)(buffer, io);
        });
        socket.on("streamReqFromClient", (source) => {
            console.log(source);
            if (states_js_1.states.current.stream[source]) {
                // if (states.stream.target[source].length > 0) {
                //   console.log(`target stream: ${source}`);
                //   targetStreamEmit(source, io, states, states.stream.target[source][0]);
                // } else {
                // console.log("socket.id: " + String(socket.id) + ", source: " + source);
                (0, streamEmit_js_1.streamEmit)(source, io, states_js_1.states, String(socket.id));
                // }
            }
        });
        socket.on("connectFromCtrl", () => {
            io.emit("gainFromServer", states_js_1.states.cmd.GAIN);
        });
        socket.on("gainFromCtrl", (gain) => {
            console.log(gain);
            states_js_1.states.cmd.GAIN[gain.target] = gain.val;
            io.emit("gainFromServer", states_js_1.states.cmd.GAIN);
        });
        socket.on("disconnect", () => {
            console.log("disconnect: " + String(socket.id));
            let sockId = String(socket.id);
            states_js_1.states.client = states_js_1.states.client.filter((id) => {
                if (io.sockets.adapter.rooms.has(id) && id !== sockId) {
                    console.log(id);
                    return id;
                }
            });
            console.log(states_js_1.states.client);
            // io.emit("statusFromServer", statusList);
        });
    });
};
exports.ioServer = ioServer;
//# sourceMappingURL=ioServer.js.map