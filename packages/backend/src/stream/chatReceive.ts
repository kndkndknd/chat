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
import { ioState } from "../state/states/ioState";

import { chatsRedis, streamsRedis } from "../data";
import { glitchStream } from "./glitchStream";
import { pushStateStream } from "./pushStateStream";
import { pickupPaStreamTarget, pickupStreamTarget } from "./pickupStreamTarget";
import { switchCramp } from "../arduinoAccess/arduinoAccess";
import { sampleRateRandomize } from "./sampleRateRandomize";
import { gridTimeoutVal } from "./gridTimeoutVal";

export const chatReceive = async (
  buffer?: buffStateType
) => {
  if (buffer !== undefined) {
    switch (buffer.source) {
      case "CHAT":
        await chatsRedis.push(buffer);
        console.log("chat length: ", await chatsRedis.length());
        console.log("bpmState", bpmState);

        if (buffer.from !== undefined) {
          chatEmit(buffer.from);
        } else {
          chatEmit();
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
    chatEmit();
  }
};

export const chatEmit = async (from?) => {
  if (currentState.stream.CHAT) {
    let targetId =
      from !== undefined
        ? pickupStreamTarget("CHAT", from)
        : pickupStreamTarget("CHAT");
    if (streamState.pa.CHAT) {
      targetId = pickupPaStreamTarget();
    }
    console.log("chatEmit targetId: ", targetId);
    console.log("bpmState", targetId, bpmState[targetId]);
    const chatsLen = await chatsRedis.length();
    if (chatsLen > 0) {
      const shifted = await chatsRedis.shift();
      if (!shifted) {
        ioState?.io.to(targetId).emit("chatReqFromServer");
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
        bpmState[targetId].stream.CHAT.gridFlag &&
        !bpmState[targetId].stream.CHAT.quantizeFlag
      ) {
        const timeOutVal = gridTimeoutVal("CHAT", targetId);
        setTimeout(() => {
          if (
            bpmState[targetId].stream.CHAT.gridFlag &&
            !bpmState[targetId].stream.CHAT.quantizeFlag
          ) {
            ioEmitChatFromServer(chunk, targetId);
          }
        }, timeOutVal);
      } else {
        ioEmitChatFromServer(chunk, targetId);
      }
    } else {
      ioState?.io.to(targetId).emit("chatReqFromServer");
    }
  } else {
    ioState?.io.emit("erasePrintFromServer");
  }
};

const ioEmitChatFromServer = async (chunk, targetId) => {
  if (streamState.floating && !clientState.client[targetId].projection) {
    const projectionChunk = {
      ...chunk,
      floating: true,
      position: clientState.client[targetId].position,
      target: targetId,
    };
    const projectionTargetId = Object.keys(clientState.client).find((key) => {
      return clientState.client[key].projection;
    });
    ioState?.io.to(projectionTargetId).emit("chatFromServer", projectionChunk);
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
  ioState?.io.to(targetId).emit("chatFromServer", chunk);
};
