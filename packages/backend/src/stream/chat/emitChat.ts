import { chats } from "../../data/chunk/streams";
import { targetEmit } from "../../webSocket";
import { currentState, streamState, sampleRateState, glitchState, bpmState, clientState } from "../../state";
import { pickupTarget } from "../../clientProcess/pickupTarget";
import { sampleRateRandomize } from "../sampleRateRandomize";
import { glitchStream } from "../glitchStream";
import { gridTimeoutVal } from "../gridTimeoutVal";
import { streamSocketType } from "../../../../../types";

export const emitChat = async (from?: string) => {
  if (currentState.stream.CHAT) {
        let targetId =
          from !== undefined
            ? pickupTarget("CHAT", "STREAM", { from })
            : pickupTarget("CHAT", "STREAM");
        if(streamState.pa.CHAT) {
          targetId = pickupTarget("CHAT", "STREAM", { pa: true });
        }
        console.log("chatEmit targetId: ", targetId);
        if (chats.length > 0) {
          const chunk = chats.shift();
          // const chunk = {
          //   sampleRate: sampleRateState.sampleRate.CHAT,
          //   glitch: glitchState.glitch.CHAT,
          //   ...chats.shift(),
          // };
          // chunk.source = "CHAT";
          if(chunk !== undefined) {
          if (sampleRateState.randomrate.CHAT) {
            if (sampleRateState.randomratenote.CHAT) {
              chunk.sampleRate = 11025 + Math.floor(Math.random() * 10) * 11025;
            } else {
              const randomizedRate = sampleRateRandomize("CHAT");
              chunk.sampleRate = randomizedRate !== undefined ? randomizedRate : chunk.sampleRate;
            }
          } else {
            chunk.sampleRate = sampleRateState.sampleRate.CHAT;
          }
          if (glitchState.glitch.CHAT && chunk.video) {
            chunk.video = await glitchStream(chunk.video);
          }
          const streamSocket: streamSocketType = {type: "stream", payload: chunk}
          console.log('bpmState', targetId, bpmState[targetId[0]]);
          if (
            bpmState[targetId[0]].stream.CHAT.gridFlag &&
            !bpmState[targetId[0]].stream.CHAT.quantizeFlag
          ) {
            const timeOutVal = gridTimeoutVal("CHAT", targetId[0]);
            setTimeout(() => {
              if (
                bpmState[targetId[0]].stream.CHAT.gridFlag &&
                !bpmState[targetId[0]].stream.CHAT.quantizeFlag
              ) {
                targetId.forEach((id) => {
                  targetEmit(id, streamSocket)
                })
              }
            }, timeOutVal);
          } else {
            targetId.forEach((id) => {
              targetEmit(id, streamSocket)
            })
          }
        }
    } else {
      targetId.forEach((id) => {
        targetEmit(id, {
          type: "streamReq",
          payload: { source: "CHAT", record: false },
        });
      });
    }
  }
};

// const chatSocketEmit = async (chunk, targetId: string[]) => {
//   // console.log("targetId", targetId);
//   // console.log("machine", states.client[targetId]);
//   targetId.forEach(async (id) => {
//     if (streamState.floating && !clientState.client[id].projection) {
//       // console.log("floating");
//       const projectionChunk = {
//         ...chunk,
//         floating: true,
//         position: clientState.client[id].position,
//         target: targetId,
//       };
//       const projectionTargetId = Object.keys(clientState.client).find((key) => {
//         return clientState.client[key].projection;
//       });
//       targetEmit(projectionTargetId, {type: "stream", payload: projectionChunk})
//       // io.to(projectionTargetId).emit("chatFromServer", projectionChunk);
//     }

//     if (
//       clientState.client[id] !== undefined &&
//       clientState.client[id].urlPathName.includes("pi") &&
//       arduinoState.connected
//     ) {
//       const result = await switchCramp("CHAT");
//       console.log("switchCramp", result);
//     }
//     console.log("chunk sampleRate:", chunk.sampleRate);
//     targetEmit(id, {type: "stream", payload: chunk})
//     // io.to(id).emit("chatFromServer", chunk);
//   });
// };
