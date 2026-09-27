import { buffStateType } from "../../../../types";
import {
  clientState,
  streamState,
  glitchState,
  sampleRateState,
  currentState,
  arduinoState,
  bpmState,
} from "../state";

import { chatsRedis, streamsRedis } from "../data";
import { glitchStream } from "./glitchStream";
import { pushStateStream } from "./pushStateStream";
import { pickupPaStreamTarget, pickupStreamTarget } from "./pickupStreamTarget";
import { switchCramp } from "../arduinoAccess/arduinoAccess";
import { sampleRateRandomize } from "./sampleRateRandomize";
import { gridTimeoutVal } from "./gridTimeoutVal";
import { chatEmit, chatReqEmit, erasePrintEmit } from "../socket/ioEmit";
import { tileMeta } from "../clientSetting/tileLayout";

export const chatReceive = async (
  buffer?: buffStateType
) => {
  if (buffer !== undefined) {
    switch (buffer.source) {
      case "CHAT":
        console.log("chatReceive before redis push, buffer from:", buffer.from);
        await chatsRedis.push(buffer);
        console.log("chat length: ", await chatsRedis.length());
        console.log("chatReceive buffer from:", buffer.from);        
        if (buffer.from !== undefined) {
          execChat(buffer.from);
        } else {
          execChat();
        }
        break;
      case "PLAYBACK":
        await streamsRedis.push("PLAYBACK", buffer);
        break;
      case "TIMELAPSE":
        await streamsRedis.push("TIMELAPSE", buffer);
        console.log(
          "TIMELAPSE.length:" + String(await streamsRedis.getLength("TIMELAPSE"))
        );
        break;
      default:
        if (!(await streamsRedis.hasKey(buffer.source))) {
          await streamsRedis.initKey(buffer.source);
        }
        await streamsRedis.push(buffer.source, buffer);
        pushStateStream(buffer.source);
    }
  } else {
    execChat();
  }
};

export const execChat = async (from?) => {
  console.log("chatEmit called to", currentState.stream.CHAT ? "specific target" : "all clients");
  if (currentState.stream.CHAT) {
    let targetId =
      from !== undefined
        ? pickupStreamTarget("CHAT", from)
        : pickupStreamTarget("CHAT");
    if (streamState.pa.CHAT) {
      targetId = pickupPaStreamTarget();
    }
    console.log("debug: Emitting chat to targetId:", targetId, streamState.target.CHAT);
    console.log("chatEmit targetId: ", targetId);
    console.log("bpmState", targetId, bpmState[targetId]);
    const chatsLen = await chatsRedis.length();
    if (chatsLen > 0) {
      const shifted = await chatsRedis.shift();
      if (!shifted) {
        chatReqEmit(targetId);
        return;
      }
      const chunk = {
        sampleRate: sampleRateState.sampleRate.CHAT,
        glitch: glitchState.glitch.CHAT,
        ...shifted,
      };
      if (sampleRateState.randomrate.CHAT) {
        if (sampleRateState.randomratenote.CHAT) {
          chunk.sampleRate = 11025 + Math.floor(Math.random() * 10) * 11025;
        } else {
          chunk.sampleRate = sampleRateRandomize("CHAT");
        }
      }
      if (glitchState.glitch.CHAT && chunk.video) {
        chunk.video = await glitchStream(chunk.video);
      }
      if (
        bpmState[targetId]?.stream?.CHAT?.gridFlag &&
        !bpmState[targetId]?.stream?.CHAT?.quantizeFlag
      ) {
        const timeOutVal = gridTimeoutVal("CHAT", targetId);
        setTimeout(() => {
          if (
            bpmState[targetId]?.stream?.CHAT?.gridFlag &&
            !bpmState[targetId]?.stream?.CHAT?.quantizeFlag
          ) {
            ioEmitChatFromServer(chunk, targetId);
          }
        }, timeOutVal);
      } else {
        ioEmitChatFromServer(chunk, targetId);
      }
    } else {
      chatReqEmit(targetId);
    }
  } else {
    erasePrintEmit();
  }
};

const projectionTargetId = (): string | undefined =>
  Object.keys(clientState.client).find(
    (key) => clientState.client[key].projection,
  );

const ioEmitChatFromServer = async (chunk, targetId) => {
  const tileEnabled = streamState.tile || streamState.floating;
  const projectionId = projectionTargetId();
  let emittedToTarget = false;

  // TILEモード（旧 floating を統合）。CHATの映像フレームを投影先クライアントの
  // タイルとして描画する。投影先自身が送出先の場合もタイル情報を付与して送る。
  if (tileEnabled && projectionId !== undefined) {
    const meta = tileMeta("CHAT", chunk.from ?? chunk.id);
    if (targetId === projectionId) {
      // 投影先自身が送出先。タイル描画後に投影先から次のフレームを
      // 要求させるため request を付与する（ストリームを止めないため）。
      chatEmit({ ...chunk, ...meta, request: true }, targetId);
      emittedToTarget = true;
    } else {
      // 投影先へは映像のみのミラーを送る（音声は通常クライアントが担当）。
      chatEmit({ ...chunk, ...meta, mirror: true }, projectionId);
    }
  }

  if (
    clientState.client[targetId] !== undefined &&
    clientState.client[targetId].urlPathName.includes("pi") &&
    arduinoState.connected
  ) {
    const result = await switchCramp("CHAT");
    console.log("switchCramp", result);
  }
  console.log("chunk sampleRate:", chunk.sampleRate);
  if (!emittedToTarget) {
    chatEmit(chunk, targetId);
  }
};
