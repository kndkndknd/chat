import WebSocket from "ws";
import * as Https from "https";
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
import { receiveWholeReq } from "../stream/receiveWholeReq";
import { IoFacade } from "./IoFacade";

let strings = "";

const deserialize = (raw: string): { type: string; data: unknown } => {
  return JSON.parse(raw, (_key, value) => {
    if (value && typeof value === "object" && value.__type === "ArrayBuffer") {
      return Buffer.from(value.data, "base64").buffer;
    }
    return value;
  });
};

export const wsServer = (
  httpserver: Https.Server | Http.Server
): IoFacade => {
  const facade = new IoFacade();
  ioState.io = facade;

  const wss = new WebSocket.Server({ server: httpserver, path: "/ws" });

  wss.on("connection", (ws: WebSocket, req) => {
    const id = facade.generateId();
    const rawAddress = req.socket.remoteAddress ?? "";
    const ipAddress = rawAddress.includes("::ffff:")
      ? rawAddress.split("::ffff:")[1]
      : rawAddress;

    facade.addClient(id, ws);
    ws.send(JSON.stringify({ type: "connected", data: { id } }));

    ws.on("message", async (rawData: Buffer) => {
      let msg: { type: string; data: unknown };
      try {
        msg = deserialize(rawData.toString());
      } catch {
        console.error("invalid JSON from client", id);
        return;
      }
      const { type, data } = msg;

      switch (type) {
        case "connectFromClient": {
          const result = connectFromClient(data, id, ipAddress);
          if (result) {
            ws.send(JSON.stringify({ type: "debugFromServer" }));
          } else {
            console.log("connectFromClient failed");
          }
          break;
        }

        case "charFromClient":
          console.log("id: " + id);
          strings = charProcess(data as string, strings, id);
          break;

        case "chatFromClient": {
          console.log("debug chatFromClient", currentState.stream);
          const buffer = data as buffStateType;
          if (buffer.from === undefined) buffer.from = id;
          chatReceive(buffer);
          break;
        }

        case "streamReqFromClient": {
          const source = data as string;
          console.log(source);
          if (currentState.stream[source]) {
            streamEmit(source, id);
          }
          break;
        }

        case "workletBufferFromClient":
          await workletBufferFromClient(
            data as { video: string; audio: ArrayBuffer; source: string; bufferSize: number }
          );
          break;

        case "bufferRecFromClient":
          console.log("bufferRecFromClient", (data as ArrayBuffer).byteLength);
          break;

        case "bufferFromClient":
          feedWebMChunk(Buffer.from(data as ArrayBuffer));
          break;

        case "wholeReqFromClient":
          await receiveWholeReq(
            data as { audio: ArrayBuffer; video: string; source: string; bufferSize: number } | undefined
          );
          break;

        case "faceDetectFromClient": {
          const faceData = data as { x: number; width: number; height: number };
          console.log("faceDetectFromClient", faceData);
          countersRedis.increment("faceDetect").then((count) => {
            console.log("faceDetect count:", count);
          });
          const buffLen = await streamsRedis.getLength("PLAYBACK");
          if (buffLen === 0) {
            stringEmit("no buffer", true, id);
            break;
          }
          const offsets = [1, 24];
          const hours = offsets[Math.floor(Math.random() * offsets.length)];
          const timestamp = Date.now() - hours * 60 * 60 * 1000;
          streamEmit("PLAYBACK", id, timestamp);
          break;
        }

        default:
          console.log("unknown message type:", type);
      }
    });

    ws.on("close", () => {
      console.log("disconnect:", id);
      facade.removeClient(id);
      if (clientState.client[id]) delete clientState.client[id];
      if (clientState.streamClient.includes(id)) {
        clientState.streamClient = clientState.streamClient.filter((el) => el !== id);
      }
      if (clientState.cmdClient.includes(id)) {
        clientState.cmdClient = clientState.cmdClient.filter((el) => el !== id);
      }
      if (bpmState[id] !== undefined) {
        delete bpmState[id];
      }
      console.log("clients:", clientState.client);
      console.log("streamClient:", clientState.streamClient);
      console.log("cmdClient:", clientState.cmdClient);
      console.log("bpm", bpmState);
    });
  });

  return facade;
};
