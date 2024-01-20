"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ioServer = void 0;
const socket_io_1 = require("socket.io");
const statusList_1 = require("../statusList");
const chatReceive_1 = require("../stream/chatReceive");
const charProcess_1 = require("../cmd/charProcess");
const streamEmit_1 = require("../stream/streamEmit");
const states_1 = require("../states");
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
                if (!states_1.states.stream.timelapse)
                    states_1.states.stream.timelapse = true;
                console.log('socket.on("connectFromClient", (data) => {data:' +
                    data +
                    ", id:" +
                    sockId +
                    "}");
                if (!states_1.states.client.includes(sockId))
                    states_1.states.client.push(sockId);
                states_1.states.client = states_1.states.client.filter((id) => {
                    //console.log(io.sockets.adapter.rooms.has(id))
                    if (io.sockets.adapter.rooms.has(id)) {
                        return id;
                    }
                });
                // METRONOMEは接続時に初期値を作る
                states_1.states.cmd.METRONOME[sockId] = 1000;
            }
            else if (data === "sinewaveClient") {
                console.log(sockId + " is sinewaveClient");
                if (!states_1.states.sinewaveClient.includes(sockId))
                    states_1.states.sinewaveClient.push(sockId);
                states_1.states.sinewaveClient = states_1.states.sinewaveClient.filter((id) => {
                    //console.log(io.sockets.adapter.rooms.has(id))
                    if (io.sockets.adapter.rooms.has(id)) {
                        return id;
                    }
                });
            }
            console.log(states_1.states.client);
            console.log(states_1.states.sinewaveClient);
            socket.emit("debugFromServer");
        });
        socket.on("charFromClient", (character) => {
            strings = (0, charProcess_1.charProcess)(character, strings, socket.id, io, states_1.states);
        });
        socket.on("chatFromClient", (buffer) => {
            console.log(states_1.states.current.stream);
            (0, chatReceive_1.chatReceive)(buffer, io, socket.id);
        });
        socket.on("streamReqFromClient", (source) => {
            console.log(source);
            if (states_1.states.current.stream[source]) {
                // if (states.stream.target[source].length > 0) {
                //   console.log(`target stream: ${source}`);
                //   targetStreamEmit(source, io, states, states.stream.target[source][0]);
                // } else {
                (0, streamEmit_1.streamEmit)(source, io, states_1.states, socket.id);
                // }
            }
        });
        socket.on("connectFromCtrl", () => {
            io.emit("gainFromServer", states_1.states.cmd.GAIN);
        });
        socket.on("gainFromCtrl", (gain) => {
            console.log(gain);
            states_1.states.cmd.GAIN[gain.target] = gain.val;
            io.emit("gainFromServer", states_1.states.cmd.GAIN);
        });
        socket.on("disconnect", () => {
            console.log("disconnect: " + String(socket.id));
            let sockId = String(socket.id);
            states_1.states.client = states_1.states.client.filter((id) => {
                if (io.sockets.adapter.rooms.has(id) && id !== sockId) {
                    console.log(id);
                    return id;
                }
            });
            console.log(states_1.states.client);
            io.emit("statusFromServer", statusList_1.statusList);
        });
    });
};
exports.ioServer = ioServer;
//# sourceMappingURL=ioServer.js.map