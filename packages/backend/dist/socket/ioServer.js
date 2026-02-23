"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ioServer = void 0;
const socket_io_1 = require("socket.io");
// import { statusList, pathList, statusClient } from "../statusList";
const chatReceive_1 = require("../stream/chatReceive");
// import {
//   selectOtherClient,
//   roomEmit,
//   pickupTarget,
//   pickCmdTarget,
//   cmdSelect,
// } from "../route";
// import { cmdEmit } from "../cmd/cmdEmit";
const charProcess_1 = require("../cmd/charProcess");
// import { stopEmit } from "../cmd/stopEmit";
// import { sinewaveEmit } from "../cmd/sinewaveEmit";
const streamEmit_1 = require("../stream/streamEmit");
const states_1 = require("../states");
const ioEmit_1 = require("./ioEmit");
// import { DefaultEventsMap } from "socket.io/dist/typed-events";
const enterFromForm_1 = require("../cmd/form/enterFromForm");
const stopEmit_1 = require("../cmd/stopEmit");
const connectFromClient_1 = require("../clientSetting/connectFromClient");
// import { stat } from "fs";
let strings = "";
const previousFace = { x: 0, y: 0 };
const ioServer = (httpserver) => {
    const io = new socket_io_1.Server(httpserver, {
        path: "/socket.io",
    });
    io.sockets.on("connection", (socket) => {
        socket.on("connectFromClient", (data) => {
            const result = (0, connectFromClient_1.connectFromClient)(data, socket, io);
            // let sockId = String(socket.id);
            // const ipAddress = socket.handshake.address;
            // console.log("ipAddress: " + ipAddress);
            // console.log("urlPathName", data.urlPathName);
            // if (data.clientMode === "client") {
            //   if (!states.stream.timelapse) states.stream.timelapse = true;
            //   console.log(
            //     'socket.on("connectFromClient", (data) => {data:' +
            //       data +
            //       ", id:" +
            //       sockId +
            //       "}"
            //   );
            //   if (!Object.keys(states.client).includes(sockId))
            //     if (data.urlPathName.includes("project")) {
            //       states.client[sockId] = {
            //         ipAddress,
            //         urlPathName: data.urlPathName,
            //         projection: true,
            //         floatingPosition: {
            //           top: 0,
            //           left: 0,
            //           width: data.width,
            //           height: data.height,
            //         },
            //       };
            //     } else {
            //       const floatingPosition = (states.client[sockId] = {
            //         ipAddress,
            //         urlPathName: data.urlPathName,
            //         projection: false,
            //       });
            //     }
            //   if (!data.urlPathName.includes("exc")) {
            //     if (!Object.keys(states.cmdClient).includes(sockId)) {
            //       states.cmdClient.push(sockId);
            //     }
            //     if (!Object.keys(states.streamClient).includes(sockId)) {
            //       states.streamClient.push(sockId);
            //     }
            //   }
            //   if (!Object.keys(states.bpm).includes(sockId)) {
            //     states.bpm[sockId] = 60;
            //   }
            //   // あとでオブジェクト向けに作り直す
            //   // states.client = states.client.filter((id) => {
            //   //   //console.log(io.sockets.adapter.rooms.has(id))
            //   //   if (io.sockets.adapter.rooms.has(id)) {
            //   //     return id;
            //   //   }
            //   // });
            //   // METRONOMEは接続時に初期値を作る
            //   states.cmd.METRONOME[sockId] = 1000;
            // } else if (data.clientMode === "sinewaveClient") {
            //   console.log(sockId + " is sinewaveClient");
            //   if (!states.sinewaveClient.includes(sockId))
            //     states.sinewaveClient.push(sockId);
            //   states.sinewaveClient = states.sinewaveClient.filter((id) => {
            //     //console.log(io.sockets.adapter.rooms.has(id))
            //     if (io.sockets.adapter.rooms.has(id)) {
            //       return id;
            //     }
            //   });
            // }
            // console.log(states.client);
            // console.log(states.sinewaveClient);
            if (result) {
                socket.emit("debugFromServer");
            }
            else {
                console.log("connectFromClient failed");
            }
        });
        socket.on("charFromClient", (character) => {
            console.log("socket.id: " + String(socket.id));
            console.log("client: " + states_1.states.client);
            strings = (0, charProcess_1.charProcess)(character, strings, socket.id, io, states_1.states);
        });
        socket.on("chatFromClient", (buffer) => {
            console.log("debug chatFromClient", states_1.states.current.stream);
            // console.log("socket.id: " + String(socket.id));
            if (buffer.from === undefined)
                buffer.from = String(socket.id);
            (0, chatReceive_1.chatReceive)(io, buffer);
        });
        socket.on("streamReqFromClient", (source) => {
            console.log(source);
            if (states_1.states.current.stream[source]) {
                // if (states.stream.target[source].length > 0) {
                //   console.log(`target stream: ${source}`);
                //   targetStreamEmit(source, io, states, states.stream.target[source][0]);
                // } else {
                // console.log("socket.id: " + String(socket.id) + ", source: " + source);
                (0, streamEmit_1.streamEmit)(source, io, states_1.states, String(socket.id));
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
        socket.on("stringFromForm", (strings) => {
            (0, ioEmit_1.stringEmit)(io, strings, false);
        });
        socket.on("enterFromForm", (strings) => {
            const formResult = (0, enterFromForm_1.enterFromForm)(strings, io);
            console.log("enterFromForm", formResult);
        });
        socket.on("escapeFromForm", () => {
            (0, stopEmit_1.stopEmit)(io, states_1.states, "form", "ExceptHls");
        });
        socket.on("disconnect", () => {
            console.log("disconnect:", String(socket.id));
            let sockId = String(socket.id);
            if (states_1.states.client[sockId])
                delete states_1.states.client[sockId];
            // states.client = states.client.filter((id) => {
            //   if (io.sockets.adapter.rooms.has(id) && id !== sockId) {
            //     console.log(id);
            //     return id;
            //   }
            // });
            if (states_1.states.streamClient.includes(sockId)) {
                states_1.states.streamClient = states_1.states.streamClient.filter((element) => {
                    return element !== sockId;
                });
            }
            if (states_1.states.cmdClient.includes(sockId)) {
                states_1.states.cmdClient = states_1.states.cmdClient.filter((element) => {
                    return element !== sockId;
                });
            }
            if (Object.keys(states_1.states.bpm).includes(sockId)) {
                delete states_1.states.bpm[sockId];
            }
            console.log("clients:", states_1.states.client);
            console.log("streamClient:", states_1.states.streamClient);
            console.log("cmdClient:", states_1.states.cmdClient);
            console.log("bpm", states_1.states.bpm);
            // io.emit("statusFromServer", statusList);
        });
    });
    return io;
};
exports.ioServer = ioServer;
//# sourceMappingURL=ioServer.js.map