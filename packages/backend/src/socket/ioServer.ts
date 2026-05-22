import { Server, Socket } from "socket.io";
import * as Http from "http";

// import { statusList, pathList, statusClient } from "../statusList";
import { chatReceive } from "../stream/chatReceive";

import { buffStateType, gainStateType } from "../../../../types";

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

import { workletBufferFromClient } from "../stream/audioWorklet/workletBufferFromClient";

// whole
import { receiveWholeReq } from "../stream/receiveWholeReq";

// rotate
import { m5Switch } from "../rotate/m5Access";

// gainFromClient
import { gainFromClient } from "../cmd/gainFromClient";

// webRtc
import { iceCandidateEmit, offerEmit, answerEmit } from "../webRTC";
import { join } from "path";

let strings = "";
const previousFace = { x: 0, y: 0 };

export const ioServer = (
  httpserver: Http.Server<
    typeof Http.IncomingMessage,
    typeof Http.ServerResponse
  >,
) => {
  const io = new Server(httpserver, {
    path: "/socket.io",
  });

  io.sockets.on("connection", (socket) => {
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
      strings = charProcess(character, strings, socket.id, io);
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

    // audioWorklet buffer
    socket.on(
      "workletBufferFromClient",
      (data: {
        video: string;
        audio: ArrayBuffer;
        source: string;
        bufferSize: number;
    }) => {
      workletBufferFromClient(data, io);
    });
    
    // gain
    socket.on("gainFromClient", (data: gainStateType) => {
      console.log("gainFromClient", data);
      gainFromClient(data, io);
    });

    // webRtc
    socket.on("joinFromClient", () => {});
    socket.on("iceCandidateFromClient", (candidate: RTCIceCandidate) => {
      console.log("iceCandidateFromClient", candidate);
      iceCandidateEmit(io, candidate, String(socket.id));
      // socket.broadcast.emit("iceCandidateFromServer", candidate);
    });

    socket.on("offerFromClient", (offer: RTCSessionDescriptionInit) => {
      console.log("offerFromClient", offer);
      offerEmit(io, offer, String(socket.id));
    });

    socket.on(
      "answerFromClient",
      (data: { answer: RTCSessionDescription; targetId: string }) => {
        console.log("answerFromClient", data.answer);
        answerEmit(io, data.answer, data.targetId);
      }
    );

    socket.on("wholeReqFromClient", (data: {audio: ArrayBuffer; video: string; source: string; bufferSize: number} | undefined) => {
      console.log("wholeReqFromClient", data);
      receiveWholeReq(io, data);
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
  return io;
};
