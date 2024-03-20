import { Server, Socket } from "socket.io";
import * as Http from "http";

// import { statusList, pathList, statusClient } from "../statusList";
import { chatReceive } from "../stream/chatReceive";

import { buffStateType } from "../types/global";

// import {
//   selectOtherClient,
//   roomEmit,
//   pickupTarget,
//   pickCmdTarget,
//   cmdSelect,
// } from "../route";
// import { cmdEmit } from "../cmd/cmdEmit";
import { charProcess } from "../cmd/charProcess";
// import { stopEmit } from "../cmd/stopEmit";
// import { sinewaveEmit } from "../cmd/sinewaveEmit";
import { streamEmit } from "../stream/streamEmit";
import { states, chat_web } from "../states";
// import { DefaultEventsMap } from "socket.io/dist/typed-events";

let strings = "";
const previousFace = { x: 0, y: 0 };

export const ioServer = (
  httpserver: Http.Server<
    typeof Http.IncomingMessage,
    typeof Http.ServerResponse
  >
) => {
  const io = new Server(httpserver, {
    path: "/socket.io",
  });

  io.sockets.on("connection", (socket) => {
    socket.on("connectFromClient", (data) => {
      let sockId = String(socket.id);
      if (data === "client") {
        if (!states.stream.timelapse) states.stream.timelapse = true;
        console.log(
          'socket.on("connectFromClient", (data) => {data:' +
            data +
            ", id:" +
            sockId +
            "}"
        );
        if (!states.client.includes(sockId)) states.client.push(sockId);
        states.client = states.client.filter((id) => {
          //console.log(io.sockets.adapter.rooms.has(id))
          if (io.sockets.adapter.rooms.has(id)) {
            return id;
          }
        });
        // METRONOMEは接続時に初期値を作る
        states.cmd.METRONOME[sockId] = 1000;
      } else if (data === "sinewaveClient") {
        console.log(sockId + " is sinewaveClient");
        if (!states.sinewaveClient.includes(sockId))
          states.sinewaveClient.push(sockId);
        states.sinewaveClient = states.sinewaveClient.filter((id) => {
          //console.log(io.sockets.adapter.rooms.has(id))
          if (io.sockets.adapter.rooms.has(id)) {
            return id;
          }
        });
      }
      console.log(states.client);
      console.log(states.sinewaveClient);
      socket.emit("debugFromServer");
    });
    socket.on("charFromClient", (character) => {
      console.log("socket.id: " + String(socket.id));
      console.log("client: " + states.client);
      strings = charProcess(character, strings, socket.id, io, states);
    });

    socket.on("chatFromClient", (buffer: buffStateType) => {
      // console.log("debug chatFromClient", states.current.stream);
      // console.log("socket.id: " + String(socket.id));
      if (buffer.from === undefined) buffer.from = String(socket.id);
      chatReceive(io, buffer);
    });

    socket.on("streamReqFromClient", (source: string) => {
      console.log(source);
      if (states.current.stream[source]) {
        // if (states.stream.target[source].length > 0) {
        //   console.log(`target stream: ${source}`);
        //   targetStreamEmit(source, io, states, states.stream.target[source][0]);
        // } else {
        // console.log("socket.id: " + String(socket.id) + ", source: " + source);
        streamEmit(source, io, states, String(socket.id));
        // }
      }
    });

    socket.on("connectFromCtrl", () => {
      io.emit("gainFromServer", states.cmd.GAIN);
    });

    socket.on("gainFromCtrl", (gain: { target: string; val: number }) => {
      console.log(gain);
      states.cmd.GAIN[gain.target] = gain.val;
      io.emit("gainFromServer", states.cmd.GAIN);
    });

    socket.on("disconnect", () => {
      console.log("disconnect: " + String(socket.id));
      let sockId = String(socket.id);
      states.client = states.client.filter((id) => {
        if (io.sockets.adapter.rooms.has(id) && id !== sockId) {
          console.log(id);
          return id;
        }
      });
      console.log(states.client);
      // io.emit("statusFromServer", statusList);
    });
  });
};
