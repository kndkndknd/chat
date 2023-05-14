"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ioServer = void 0;
var socket_io_1 = require("socket.io");
var statusList_1 = require("../statusList");
var stream_1 = require("../stream");
var cmdEmit_1 = require("../cmd/cmdEmit");
var charProcess_1 = require("../cmd/charProcess");
var stopEmit_1 = require("../cmd/stopEmit");
var sinewaveEmit_1 = require("../cmd/sinewaveEmit");
var stream_2 = require("../stream");
var states_1 = require("../states");
// face
var states_2 = require("../states");
var strings = "";
var previousFace = { x: 0, y: 0 };
var ioServer = function (httpserver) {
    var io = new socket_io_1.Server(httpserver, {
        path: "/socket.io",
    });
    io.sockets.on('connection', function (socket) {
        socket.on("connectFromClient", function (data) {
            if (!states_1.states.stream.timelapse)
                states_1.states.stream.timelapse = true;
            var sockId = String(socket.id);
            console.log('socket.on("connectFromClient", (data) => {data:' + data + ', id:' + sockId + '}');
            if (!states_1.states.client.includes(sockId))
                states_1.states.client.push(sockId);
            states_1.states.client = states_1.states.client.filter(function (id) {
                //console.log(io.sockets.adapter.rooms.has(id))
                if (io.sockets.adapter.rooms.has(id)) {
                    return id;
                }
            });
            // METRONOMEは接続時に初期値を作る
            states_1.states.cmd.METRONOME[sockId] = 1000;
            console.log(states_1.states.client);
            socket.emit('debugFromServer');
        });
        socket.on('charFromClient', function (character) {
            strings = (0, charProcess_1.charProcess)(character, strings, socket.id, io, states_1.states);
        });
        socket.on('chatFromClient', function (buffer) {
            console.log(states_1.states.current.stream);
            (0, stream_1.chatReceive)(buffer, io);
        });
        socket.on('streamReqFromClient', function (source) {
            console.log(source);
            if (states_1.states.current.stream[source]) {
                (0, stream_2.streamEmit)(source, io, states_1.states);
            }
        });
        socket.on('connectFromCtrl', function () {
            io.emit('gainFromServer', states_1.states.cmd.GAIN);
        });
        socket.on('gainFromCtrl', function (gain) {
            console.log(gain);
            states_1.states.cmd.GAIN[gain.target] = gain.val;
            io.emit('gainFromServer', states_1.states.cmd.GAIN);
        });
        /*
        socket.on('orientationFromClient', (deviceorientation) => {
          console.log(deviceorientation)
          io.emit('orientationFromServer', deviceorientation)
        })
        */
        // face
        socket.on('faceFromClient', function (data) {
            console.log(data);
            //cmdEmit("CLICK", io, states)
            if (data.detection) {
                //if(!faceState.flag) faceState.flag = true
                var speed = (data.box._x - states_2.faceState.previousFace.x) ^ 2 + (data.box._y - states_2.faceState.previousFace.y) ^ 2;
                states_2.faceState.previousFace.x = data.box._x;
                states_2.faceState.previousFace.y = data.box._y;
                console.log(previousFace);
                console.log("speed :" + String(speed));
                // console.log(speed)
                var targetClient = states_1.states.client[0];
                console.log(targetClient);
                switch (states_2.faceState.expression) {
                    case "no expression":
                        if (!states_2.faceState.flag) {
                            (0, stream_2.streamEmit)("EMPTY", io, states_1.states);
                            // send empty
                            states_2.faceState.flag = true;
                        }
                        break;
                    case "gluttony":
                        console.log('whitenoise');
                        (0, cmdEmit_1.cmdEmit)("WHITENOISE", io, states_1.states);
                        break;
                    case "greed":
                        console.log('click');
                        (0, cmdEmit_1.cmdEmit)("CLICK", io, states_1.states);
                        break;
                    case "envy":
                        if (!states_2.faceState.flag) {
                            (0, sinewaveEmit_1.sinewaveEmit)(String(data.box._x + data.box._y), io, states_1.states);
                            /*
                            console.log('chat')
                            streamEmit("CHAT", io, states)
                            */
                            states_2.faceState.flag = true;
                        }
                        break;
                    case "lust":
                        if (!states_2.faceState.flag) {
                            console.log('bass');
                            (0, cmdEmit_1.cmdEmit)("BASS", io, states_1.states);
                            states_2.faceState.flag = true;
                        }
                        break;
                    case "wrath":
                        console.log('sinewave');
                        // send sinewave(frequency: speed)
                        break;
                    case "pride":
                        if (!states_2.faceState.flag) {
                            console.log('feedback');
                            (0, cmdEmit_1.cmdEmit)("FEEDBACK", io, states_1.states);
                            states_2.faceState.flag = true;
                        }
                        break;
                    case "sloth":
                        if (!states_2.faceState.flag) {
                            // send playback
                            (0, stream_2.streamEmit)("PLAYBACK", io, states_1.states);
                            states_2.faceState.flag = true;
                        }
                        break;
                }
                //io.to(states.client[0]).emit('squareFromServer', speed)  
            }
            else {
                if (states_2.faceState.expression !== 'greed') {
                    (0, stopEmit_1.stopEmit)(io, states_1.states);
                }
                states_2.faceState.previousFace.x = 0;
                states_2.faceState.previousFace.y = 0;
                states_2.faceState.flag = false;
            }
        });
        socket.on('expressionFromClient', function (data) {
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
        socket.on("disconnect", function () {
            console.log('disconnect: ' + String(socket.id));
            var sockId = String(socket.id);
            states_1.states.client = states_1.states.client.filter(function (id) {
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