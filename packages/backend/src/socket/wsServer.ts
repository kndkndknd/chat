import WebSocket from "ws";
import * as Https from "https";
import * as Http from "http";

import { buffStateType, gainStateType } from "../../../../types";
import { currentState, flagState } from "../state";
import {
  isChatData,
  isConnectData,
  isFaceDetectData,
  isGainData,
  isMediaUploadData,
  isIceCandidate,
  isRecord,
  isRelayRegisterData,
  isResizeData,
  isSdpDescription,
  isStreamReqData,
  isWholeData,
  isWorkletData,
} from "./validateMessage";
import { chatReceive } from "../stream/chatReceive";
import { charProcess } from "../cmd/charProcess";
import { execStream } from "../stream/execStream";
import { ioState } from "../state/states/ioState";
import {
  connectFromClient,
  updateClientSize,
} from "../clientSetting/connectFromClient";
import { removeClientState } from "../clientSetting/disconnectFromClient";
import { emitClientSettings } from "../clientSetting/clientSettingsEmit";
import { countersRedis } from "../redis/streamsRedis";
import { faceDetectScenario } from "../scenario/faceDetectScenario";
import { workletBufferFromClient } from "../stream/audioWorklet/workletBufferFromClient";
import { mediaUploadFromClient } from "../media/mediaUploadFromClient";
import { getVideoBuffer } from "../media/videoBufferStore";
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
import { stringEmit, videoBufferEmit, muteReqEmit } from "./ioEmit";

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

  const wss = new WebSocket.Server({
    server: httpserver,
    path: "/ws",
    // VIDEOBUFFER の 32MB blob を base64 化しても収まる上限。
    maxPayload: 48 * 1024 * 1024,
  });

  wss.on("connection", (ws: WebSocket, req) => {
    const id = facade.generateId();
    const rawAddress = req.socket.remoteAddress ?? "";
    const ipAddress = rawAddress.includes("::ffff:")
      ? rawAddress.split("::ffff:")[1]
      : rawAddress;

    facade.addClient(id, ws);
    ws.send(JSON.stringify({ type: "connected", data: { id } }));
    // 接続直後（クライアントの初期化前を含む）に現在のミュート状態を送る。
    // フロント側は初期化前でも flagState.mute に保持し、initAudio 時に反映する。
    muteReqEmit(flagState.mute, id);

    const onMessage = async (rawData: Buffer) => {
      let msg: unknown;
      try {
        msg = deserialize(rawData.toString());
      } catch {
        console.error("invalid JSON from client", id);
        return;
      }
      if (!isRecord(msg) || typeof msg.type !== "string") {
        console.error("invalid message envelope from client", id);
        return;
      }
      const { type, data } = msg;

      switch (type) {
        case "connectFromClient": {
          if (!isConnectData(data)) {
            console.warn("invalid connectFromClient data:", id);
            break;
          }
          const result = connectFromClient(data, id, ipAddress);
          if (result) {
            ws.send(JSON.stringify({ type: "debugFromServer" }));
            emitClientSettings(id);
            // 接続直後の同期を取りこぼしても、初期化完了後の登録時に再送する。
            muteReqEmit(flagState.mute, id);
          } else {
            console.log("connectFromClient failed");
          }
          break;
        }

        case "charFromClient": {
          if (typeof data !== "string") {
            console.warn("invalid charFromClient data:", id);
            break;
          }
          console.log("id: " + id);
          strings = charProcess(data, strings, id);
          break;
        }

        case "chatFromClient": {
          if (!isChatData(data)) {
            console.warn("invalid chatFromClient data:", id);
            break;
          }
          console.log("debug chatFromClient", currentState.stream);
          const buffer = {
            ...data,
            from: data.from ?? id,
          } as buffStateType;
          await chatReceive(buffer);
          break;
        }

        case "streamReqFromClient": {
          let source: string;
          let index: number | undefined;
          if (typeof data === "string") {
            source = data;
          } else if (isStreamReqData(data)) {
            source = data.source;
            index = data.index;
          } else {
            console.warn("invalid streamReqFromClient data:", id);
            break;
          }
          console.log(source, "index:", index);
          if (currentState.stream[source]) {
            await execStream(source, id, undefined, index);
          }
          break;
        }

        case "workletBufferFromClient": {
          if (!isWorkletData(data)) {
            console.warn("invalid workletBufferFromClient data:", id);
            break;
          }
          await workletBufferFromClient(data, id);
          break;
        }

        case "mediaUploadFromClient":
          if (!isMediaUploadData(data)) {
            console.warn("invalid mediaUploadFromClient data:", id);
            break;
          }
          // Redis 障害等で reject してもハンドラの未処理 rejection にしない。
          try {
            await mediaUploadFromClient(
              data as {
                container: string;
                mimeType: string;
                blob: ArrayBuffer;
              },
              id
            );
          } catch (err) {
            console.error("mediaUploadFromClient failed:", err);
          }
          break;

        // PLAYVIDEOBUFFER: 保持している直近の録画を要求元クライアントへ返す。
        case "videoBufferReqFromClient": {
          // Redis 障害や保持データの破損 (JSON.parse) で reject しても
          // ハンドラの未処理 rejection にしない。
          try {
            const videoBuffer = await getVideoBuffer();
            if (videoBuffer === null) {
              console.log("videoBufferReqFromClient: no recording stored");
              // 要求端末に「保持が無い」ことを表示する。
              stringEmit("NO VIDEOBUFFER", true, id);
              break;
            }
            videoBufferEmit(videoBuffer, id);
          } catch (err) {
            console.error("videoBufferReqFromClient failed:", err);
          }
          break;
        }

        case "gainFromClient":
          if (!isGainData(data)) {
            console.warn("invalid gainFromClient data:", id);
            break;
          }
          console.log("gainFromClient", data);
          gainFromClient(data as gainStateType, facade);
          break;

        case "gainReqFromClient":
          console.log("gainReqFromClient", id);
          gainReqFromClient(facade);
          break;

        case "wholeReqFromClient":
          if (data !== undefined && !isWholeData(data)) {
            console.warn("invalid wholeReqFromClient data:", id);
            break;
          }
          await receiveWholeReq(
            data as
              | {
                  audio: ArrayBuffer;
                  video: string;
                  source: string;
                  bufferSize: number;
                }
              | undefined
          );
          break;

        case "rotateReqFromClient": {
          if (typeof data !== "boolean") {
            console.warn("invalid rotateReqFromClient data:", id);
            break;
          }
          console.log("rotateReqFromClient", id, data);
          await m5Switch("rotation", data);
          break;
        }

        case "faceDetectFromClient": {
          if (!isFaceDetectData(data)) {
            console.warn("invalid faceDetectFromClient data:", id);
            break;
          }
          console.log("faceDetectFromClient", data);
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
          if (!isRelayRegisterData(data)) {
            console.warn("invalid relayRegisterFromClient data:", id);
            break;
          }
          registerRelay(data.role, id);
          break;

        case "relayOfferFromClient": {
          if (
            !isRecord(data) ||
            typeof data.to !== "string" ||
            !isSdpDescription(data.offer)
          ) {
            console.warn("invalid relayOfferFromClient data:", id);
            break;
          }
          relayOffer(data.to, data.offer, id);
          break;
        }

        case "relayAnswerFromClient": {
          if (
            !isRecord(data) ||
            typeof data.to !== "string" ||
            !isSdpDescription(data.answer)
          ) {
            console.warn("invalid relayAnswerFromClient data:", id);
            break;
          }
          relayAnswer(data.to, data.answer, id);
          break;
        }

        case "relayIceFromClient": {
          if (
            !isRecord(data) ||
            typeof data.to !== "string" ||
            !isIceCandidate(data.candidate)
          ) {
            console.warn("invalid relayIceFromClient data:", id);
            break;
          }
          relayIce(data.to, data.candidate, id);
          break;
        }

        case "resizeFromClient": {
          if (!isResizeData(data)) {
            console.warn("invalid resizeFromClient data:", id);
            break;
          }
          updateClientSize(id, data);
          break;
        }

        default:
          console.log("unknown message type:", type);
      }
    };

    ws.on("message", (rawData: Buffer) => {
      void onMessage(rawData).catch((error) => {
        console.error(`[ws] message handling failed (${id}):`, error);
      });
    });

    ws.on("close", () => {
      console.log("disconnect:", id);
      facade.removeClient(id);
      handleRelayDisconnect(id);
      removeClientState(id);
    });
  });

  return facade;
};
