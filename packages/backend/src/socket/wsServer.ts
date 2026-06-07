import WebSocket from "ws";
import * as Https from "https";
import * as Http from "http";

import { buffStateType, gainStateType } from "../../../../types";
import { clientState, currentState, bpmState } from "../state";
import { chatReceive } from "../stream/chatReceive";
import { charProcess } from "../cmd/charProcess";
import { streamEmit } from "../stream/streamEmit";
import { ioState } from "../state/states/ioState";
import { connectFromClient } from "../clientSetting/connectFromClient";
import { emitClientSettings } from "../clientSetting/clientSettingsEmit";
import { applyNightModeToClient } from "../nightMode/nightMode";
import { countersRedis } from "../redis/streamsRedis";
import { faceDetectScenario } from "../scenario/faceDetectScenario";
import { workletBufferFromClient } from "../stream/audioWorklet/workletBufferFromClient";
import { receiveWholeReq } from "../stream/receiveWholeReq";
import { gainFromClient, gainReqFromClient } from "../cmd/gainFromClient";
import { m5Switch } from "../rotate/m5Access";
import {
  registerRelay,
  relayOffer,
  relayAnswer,
  relayIce,
  handleRelayDisconnect,
} from "../relay";
import { IoFacade } from "./IoFacade";

let strings = "";

export const deserialize = (raw: string): { type: string; data: unknown } => {
  return JSON.parse(raw, (_key, value) => {
    if (value && typeof value === "object" && value.__type === "ArrayBuffer") {
      const buf = Buffer.from(value.data, "base64");
      // Buffer.from(string, "base64") は短いデータで Node の内部プール
      // (Buffer.poolSize=8192) からスライスを返すことがある。.buffer をそのまま
      // 返すとプール全体 (8192 バイト) が露出し、先頭に他バッファの残骸が
      // 混入する。実データの範囲だけ切り出して新しい ArrayBuffer を返す。
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
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
            // ナイトモード作動中なら、この端末も顔認識OFF＋BLACKに合わせる。
            // emitClientSettings の前に facedetection を false にしておく。
            applyNightModeToClient(id);
            emitClientSettings(id);
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
          const source =
            typeof data === "string" ? data : (data as { source: string }).source;
          const index =
            typeof data === "string" ? undefined : (data as { index?: number }).index;
          console.log(source, "index:", index);
          if (currentState.stream[source]) {
            streamEmit(source, id, undefined, index);
          }
          break;
        }

        case "workletBufferFromClient":
          await workletBufferFromClient(
            data as { video: string; audio: ArrayBuffer; source: string; bufferSize: number; index?: number }
          );
          break;

        case "gainFromClient":
          console.log("gainFromClient", data);
          gainFromClient(data as gainStateType, facade);
          break;

        case "gainReqFromClient":
          console.log("gainReqFromClient", id);
          gainReqFromClient(facade);
          break;

        case "wholeReqFromClient":
          await receiveWholeReq(
            data as { audio: ArrayBuffer; video: string; source: string; bufferSize: number } | undefined
          );
          break;

        case "rotateReqFromClient": {
          const value = data === true;
          console.log("rotateReqFromClient", id, value);
          await m5Switch("rotation", value);
          break;
        }

        case "faceDetectFromClient": {
          const faceData = data as { x: number; width: number; height: number };
          console.log("faceDetectFromClient", faceData);
          countersRedis.increment("faceDetect").then((count) => {
            console.log("faceDetect count:", count);
          });
          await faceDetectScenario(id);
          break;
        }

        // ---- /webrtc 受信映像のリレー (中継) シグナリング ----
        // 既存ロジックとは分離した relay* 系。chat_sync とは無関係で、
        // chat_itsuki 内ブラウザ間 (/webrtc sender ←→ /relay receiver) の中継。
        case "relayRegisterFromClient":
          registerRelay((data as { role: "sender" | "receiver" }).role, id);
          break;

        case "relayOfferFromClient": {
          const d = data as { to: string; offer: RTCSessionDescriptionInit };
          relayOffer(d.to, d.offer, id);
          break;
        }

        case "relayAnswerFromClient": {
          const d = data as { to: string; answer: RTCSessionDescriptionInit };
          relayAnswer(d.to, d.answer, id);
          break;
        }

        case "relayIceFromClient": {
          const d = data as { to: string; candidate: RTCIceCandidateInit };
          relayIce(d.to, d.candidate, id);
          break;
        }

        default:
          console.log("unknown message type:", type);
      }
    });

    ws.on("close", () => {
      console.log("disconnect:", id);
      facade.removeClient(id);
      handleRelayDisconnect(id);
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
