import { Server } from "socket.io";
import * as Http from "http";

import { buffStateType } from "../../../../types";
import { clientState, currentState, bpmState } from "../state";

import { chatReceive } from "../stream/chatReceive";

import { charProcess } from "../cmd/charProcess";
import { streamEmit } from "../stream/streamEmit";

import { ioState } from "../state/states/ioState";
import { stringEmit } from "./ioEmit";
import { connectFromClient } from "../clientSetting/connectFromClient";
import { countersRedis, streamsRedis } from "../redis/streamsRedis";

import { workletBufferFromClient } from "../stream/audioWorklet/workletBufferFromClient";
import { feedWebMChunk } from "../webRTC/weriftClient";

// whole
import { receiveWholeReq } from "../stream/receiveWholeReq";

let strings = "";
const previousFace = { x: 0, y: 0 };

export const ioServer = (
  httpserver: Http.Server<
    typeof Http.IncomingMessage,
    typeof Http.ServerResponse
  >,
) => {
  // const io = new Server(httpserver, {
  //   path: "/socket.io",
  // });
  ioState.io = new Server(httpserver, {
    path: "/socket.io",
  });

  ioState.io.sockets.on("connection", (socket) => {
    socket.on("connectFromClient", (data) => {
      const result = connectFromClient(data, socket);

      if (result) {
        socket.emit("debugFromServer");
      } else {
        console.log("connectFromClient failed");
      }
    });
    socket.on("charFromClient", (character) => {
      console.log("socket.id: " + String(socket.id));
      console.log("client: " + clientState.client);
      strings = charProcess(character, strings, socket.id);
    });

    socket.on("chatFromClient", (buffer: buffStateType) => {
      console.log("debug chatFromClient", currentState.stream);
      // console.log("socket.id: " + String(socket.id));
      if (buffer.from === undefined) buffer.from = String(socket.id);
      chatReceive(buffer);
    });

    socket.on("streamReqFromClient", (source: string) => {
      console.log(source);
      if (currentState.stream[source]) {
        // if (states.stream.target[source].length > 0) {
        //   console.log(`target stream: ${source}`);
        //   targetStreamEmit(source, io, states, states.stream.target[source][0]);
        // } else {
        // console.log("socket.id: " + String(socket.id) + ", source: " + source);
        streamEmit(source, String(socket.id));
        // }
      }
    });

    // audioWorklet buffer
    socket.on(
      "workletBufferFromClient",
      (data: {
        video: string;
        audio: ArrayBuffer;
        source: string;
        bufferSize: number;
    }) => {
      workletBufferFromClient(data);
    });

    // videoBuffer
    socket.on("bufferRecFromClient", (buffer: ArrayBuffer) => {
      console.log("bufferRecFromClient", buffer.byteLength);
    });

    socket.on("bufferFromClient", (buffer: ArrayBuffer) => {
      console.log("bufferFromClient", buffer.byteLength);
      feedWebMChunk(Buffer.from(buffer));
    });

    socket.on("wholeReqFromClient", (data: {audio: ArrayBuffer; video: string; source: string; bufferSize: number} | undefined) => {
      console.log("wholeReqFromClient", data);
      receiveWholeReq(data);
    });

    socket.on("faceDetectFromClient", async (data: { x: number; width: number; height: number }) => {
      console.log("faceDetectFromClient", data);
      countersRedis.increment("faceDetect").then((count) => {
        console.log("faceDetect count:", count);
      });

      const buffLen = await streamsRedis.getLength("PLAYBACK");
      if (buffLen === 0) {
        stringEmit("no buffer", true, String(socket.id));
        return;
      }

      const offsets = [1, 24];
      const hours = offsets[Math.floor(Math.random() * offsets.length)];
      const timestamp = Date.now() - hours * 60 * 60 * 1000;
      streamEmit("PLAYBACK", String(socket.id), timestamp);
    });

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
          },
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
  return ioState.io;
};
