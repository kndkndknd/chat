import { Server, Socket } from "socket.io";
import * as Http from "http";
import express from "express";

// import { statusList, pathList, statusClient } from "../statusList";
import { chatReceive } from "../stream/chatReceive";

import { buffStateType } from "../../../../types";

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
import { clientState, cmdState, currentState, bpmState } from "../state";
import { stringEmit } from "./ioEmit";
// import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { enterFromForm } from "../cmd/form/enterFromForm";
import { stopEmit } from "../cmd/stopEmit";
import { connectFromClient } from "../clientSetting/connectFromClient";

// websocket
import { sendCharWebSocket } from "../webSocket/sendChar";

import { videoReceive } from "../stream/video/videoReceive";

// rotate
import { m5Switch } from "../rotate/m5Access";

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
      const result = connectFromClient(data, socket, io);

      if (result) {
        socket.emit("debugFromServer");
      } else {
        console.log("connectFromClient failed");
      }
    });
    socket.on("charFromClient", (character) => {
      console.log("socket.id: " + String(socket.id));
      console.log("client: " + clientState.client);
      strings = charProcess(character, strings, socket.id, io);
      // sendCharWebSocket(character);
    });

    socket.on("chatFromClient", (buffer: buffStateType) => {
      console.log("debug chatFromClient", currentState.stream);
      // console.log("socket.id: " + String(socket.id));
      if (buffer.from === undefined) buffer.from = String(socket.id);
      chatReceive(io, buffer);
    });

    socket.on("streamReqFromClient", (source: string) => {
      console.log(source);
      if (currentState.stream[source]) {
        // if (states.stream.target[source].length > 0) {
        //   console.log(`target stream: ${source}`);
        //   targetStreamEmit(source, io, states, states.stream.target[source][0]);
        // } else {
        // console.log("socket.id: " + String(socket.id) + ", source: " + source);
        streamEmit(source, io, String(socket.id));
        // }
      }
    });

    socket.on("connectFromCtrl", () => {
      io.emit("gainFromServer", cmdState.GAIN);
    });

    socket.on("gainFromCtrl", (gain: { target: string; val: number }) => {
      console.log(gain);
      cmdState.GAIN[gain.target] = gain.val;
      io.emit("gainFromServer", cmdState.GAIN);
    });

    socket.on("stringFromForm", (strings: string) => {
      stringEmit(io, strings, false);
    });

    socket.on("enterFromForm", (strings: string) => {
      const formResult = enterFromForm(strings, io);
      console.log("enterFromForm", formResult);
    });

    socket.on("escapeFromForm", () => {
      stopEmit(io, "form", "ExceptHls");
    });

    // WebRTC
    socket.on("rtcConnectionFromClient", (data) => {
      console.log("rtcConnectionFromClient", data);
      if (data.type !== undefined) console.log("type: ", data.type);
      socket.broadcast.emit("rtcConnectionFromServer", data);
    });

    // rotate
    socket.on("startRotationFromSmartphone", () => {
      m5Switch();
    });

    socket.on(
      "videoFromClient",
      ({ chunk, isFirstChunk }: { chunk: Blob; isFirstChunk: boolean }) => {
        videoReceive(chunk, isFirstChunk, io);
      }
    );

    socket.on("disconnect", () => {
      console.log("disconnect:", String(socket.id));
      let sockId = String(socket.id);
      if (clientState.client[sockId]) delete clientState.client[sockId];
      // states.client = states.client.filter((id) => {
      //   if (io.sockets.adapter.rooms.has(id) && id !== sockId) {
      //     console.log(id);
      //     return id;
      //   }
      // });
      if (clientState.streamClient.includes(sockId)) {
        clientState.streamClient = clientState.streamClient.filter(
          (element) => {
            return element !== sockId;
          }
        );
      }
      if (clientState.cmdClient.includes(sockId)) {
        clientState.cmdClient = clientState.cmdClient.filter((element) => {
          return element !== sockId;
        });
      }
      if (bpmState[sockId] !== undefined) {
        delete bpmState[sockId];
      }

      console.log("clients:", clientState.client);
      console.log("streamClient:", clientState.streamClient);
      console.log("cmdClient:", clientState.cmdClient);
      console.log("bpm", bpmState);
      // io.emit("statusFromServer", statusList);
    });
  });
  return io;
};
