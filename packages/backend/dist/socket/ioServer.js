"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ioServer = void 0;
const socket_io_1 = require("socket.io");
const statusList_1 = require("../statusList");
const chatReceive_1 = require("../stream/chatReceive");
const cmdEmit_1 = require("../cmd/cmdEmit");
const charProcess_1 = require("../cmd/charProcess");
const stopEmit_1 = require("../cmd/stopEmit");
const sinewaveEmit_1 = require("../cmd/sinewaveEmit");
const streamEmit_1 = require("../stream/streamEmit");
const targetStreamEmit_1 = require("../stream/targetStreamEmit");
const states_1 = require("../states");
// face
const states_2 = require("../states");
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
            (0, chatReceive_1.chatReceive)(buffer, io);
        });
        socket.on("streamReqFromClient", (source) => {
            console.log(source);
            if (states_1.states.current.stream[source]) {
                if (states_1.states.stream.target[source].length > 0) {
                    console.log(`target stream: ${source}`);
                    (0, targetStreamEmit_1.targetStreamEmit)(source, io, states_1.states, states_1.states.stream.target[source][0]);
                }
                else {
                    (0, streamEmit_1.streamEmit)(source, io, states_1.states);
                }
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
        /*
        socket.on('orientationFromClient', (deviceorientation) => {
          console.log(deviceorientation)
          io.emit('orientationFromServer', deviceorientation)
        })
        */
        // face
        socket.on("faceFromClient", (data) => {
            console.log(data);
            //cmdEmit("CLICK", io, states)
            if (data.detection) {
                //if(!faceState.flag) faceState.flag = true
                const speed = (data.box._x - states_2.faceState.previousFace.x) ^
                    (2 + (data.box._y - states_2.faceState.previousFace.y)) ^
                    2;
                states_2.faceState.previousFace.x = data.box._x;
                states_2.faceState.previousFace.y = data.box._y;
                console.log(previousFace);
                console.log("speed :" + String(speed));
                // console.log(speed)
                const targetClient = states_1.states.client[0];
                console.log(targetClient);
                switch (states_2.faceState.expression) {
                    case "no expression":
                        if (!states_2.faceState.flag) {
                            (0, streamEmit_1.streamEmit)("EMPTY", io, states_1.states);
                            // send empty
                            states_2.faceState.flag = true;
                        }
                        break;
                    case "gluttony":
                        console.log("whitenoise");
                        (0, cmdEmit_1.cmdEmit)("WHITENOISE", io, states_1.states);
                        break;
                    case "greed":
                        console.log("click");
                        (0, cmdEmit_1.cmdEmit)("CLICK", io, states_1.states);
                        break;
                    case "envy":
                        if (!states_2.faceState.flag) {
                            (0, sinewaveEmit_1.sinewaveEmit)(data.box._x + data.box._y, io, states_1.states);
                            /*
                            console.log('chat')
                            streamEmit("CHAT", io, states)
                            */
                            states_2.faceState.flag = true;
                        }
                        break;
                    case "lust":
                        if (!states_2.faceState.flag) {
                            console.log("bass");
                            (0, cmdEmit_1.cmdEmit)("BASS", io, states_1.states);
                            states_2.faceState.flag = true;
                        }
                        break;
                    case "wrath":
                        console.log("sinewave");
                        // send sinewave(frequency: speed)
                        break;
                    case "pride":
                        if (!states_2.faceState.flag) {
                            console.log("feedback");
                            (0, cmdEmit_1.cmdEmit)("FEEDBACK", io, states_1.states);
                            states_2.faceState.flag = true;
                        }
                        break;
                    case "sloth":
                        if (!states_2.faceState.flag) {
                            // send playback
                            (0, streamEmit_1.streamEmit)("PLAYBACK", io, states_1.states);
                            states_2.faceState.flag = true;
                        }
                        break;
                }
                //io.to(states.client[0]).emit('squareFromServer', speed)
            }
            else {
                if (states_2.faceState.expression !== "greed") {
                    (0, stopEmit_1.stopEmit)(io, states_1.states);
                }
                states_2.faceState.previousFace.x = 0;
                states_2.faceState.previousFace.y = 0;
                states_2.faceState.flag = false;
            }
        });
        socket.on("expressionFromClient", (data) => {
            console.log(data);
            states_2.faceState.expression = data;
            states_2.faceState.flag = false;
            // strings = charProcess(data,strings, socket.id, io, states);
            /*
            states.cmd.VOICE.forEach((element) => {
              io.to(element).emit('voiceFromServer', {text: data, lang: states.cmd.voiceLang})
            })
            */
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