import SocketIO from "socket.io";
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
import { chats, streams } from "../data";
import { glitchStream } from "./glitchStream";
import { pushStateStream } from "./pushStateStream";
// import { pickupTarget } from "../route";
import { pickupStreamTarget } from "./pickupStreamTarget";
import { switchCramp } from "../arduinoAccess/arduinoAccess";
import { sampleRateRandomize } from "./sampleRateRandomize";
import { stat } from "fs";
import { gridTimeoutVal } from "./gridTimeoutVal";

export const chatReceive = async (
  io: SocketIO.Server,
  buffer?: buffStateType
  // from: string
) => {
  // console.log("buffer.keys:", Object.keys(buffer));
  // console.log("buffer.target:", buffer.target);
  // console.log("buffer.from:", buffer.from);
  if (buffer !== undefined) {
    switch (buffer.source) {
      case "CHAT":
        chats.push(buffer);
        console.log("chat length: ", chats.length);
        if (buffer.from !== undefined) {
          chatEmit(io, buffer.from);
        } else {
          chatEmit(io);
        }
        break;
      case "PLAYBACK": //RECORDコマンドからのチャンク受信
        streams.PLAYBACK.audio.push(buffer.audio);
        streams.PLAYBACK.video.push(buffer.video);
        streams.PLAYBACK.bufferSize = buffer.bufferSize;
        // streams.PLAYBACK.push(buffer);
        // console.log("PLAYBACK.length:" + String(streams.PLAYBACK.length));
        break;
      case "TIMELAPSE":
        streams.TIMELAPSE.audio.push(buffer.audio);
        streams.TIMELAPSE.video.push(buffer.video);
        streams.TIMELAPSE.bufferSize = buffer.bufferSize;
        // console.log(buffer.audio)
        console.log(
          "TIMELAPSE.length:" + String(streams.TIMELAPSE.audio.length)
        );
        break;
      /*
      case "SHOT":
        if (streams["SHOT"] === undefined || streams["SHOT"] === null) {
          streams["SHOT"] = { audio: [], video: [], bufferSize: basisBufferSize };
        }
  
        streams["SHOT"].audio.push(buffer.audio);
        streams["SHOT"].video.push(buffer.video);
        console.log("SHOT.length:" + String(streams["SHOT"].audio.length));
        break;
        */
      default:
        // 存在しないターゲットの場合は、新規作成
        if (
          streams[buffer.source] === undefined ||
          streams[buffer.source] === null
        ) {
          streams[buffer.source] = {
            audio: [],
            video: [],
            bufferSize: streamState.basisBufferSize,
            index: 0,
          };
        }
        streams[buffer.source].audio.push(buffer.audio);
        streams[buffer.source].video.push(buffer.video);
        pushStateStream(buffer.source);
    }
  } else {
    chatEmit(io);
  }
};

export const chatEmit = async (io, from?) => {
  if (currentState.stream.CHAT) {
    // console.log(states.client);
    // console.log(io.sockets.adapter.rooms);
    // console.log(io.sockets.adapter.rooms.size);
    // console.log(io.sockets.adapter.rooms.get(buffer.from));
    const targetId =
      from !== undefined
        ? pickupStreamTarget("CHAT", from)
        : pickupStreamTarget("CHAT");
    // const targetId =
    //   states.client[Math.floor(Math.random() * states.client.length)];
    // console.log("chatReceive targetId: ", targetId);
    // if (targetId !== "arduino") {
    if (chats.length > 0) {
      const chunk = {
        sampleRate: sampleRateState.sampleRate.CHAT,
        glitch: glitchState.glitch.CHAT,
        ...chats.shift(),
      };
      if (sampleRateState.randomrate.CHAT) {
        if (sampleRateState.randomratenote.CHAT) {
          chunk.sampleRate = 11025 + Math.floor(Math.random() * 10) * 11025;
        } else {
          chunk.sampleRate = sampleRateRandomize("CHAT");
          // chunk.sampleRate =
          //   states.stream.randomraterange.CHAT.min +
          //   Math.floor(
          //     Math.random() *
          //       (states.stream.randomraterange.CHAT.max -
          //         states.stream.randomraterange.CHAT.min)
          //   );
        }
        // chunk.sampleRate = sampleRateRandomize("CHAT");
        //          console.log(chunk.sampleRate)
      }
      if (glitchState.glitch.CHAT && chunk.video) {
        chunk.video = await glitchStream(chunk.video);
        // console.log("glitch", chunk.video.slice(0, 50));
      }
      // if (!streamState.grid.CHAT) {
      //   // io.to(targetId).emit("chatFromServer", chunk);
      //   ioEmitChatFromServer(io, chunk, targetId);
      // } else {
      if (
        bpmState[targetId].stream.CHAT.gridFlag &&
        !bpmState[targetId].stream.CHAT.quantizeFlag
      ) {
        const timeOutVal = gridTimeoutVal("CHAT", targetId);
        // const timeOutVal = Object.keys(cmdState.METRONOME).includes(targetId)
        //   ? (Math.round(Math.random() * 16) * cmdState.METRONOME[targetId]) / 4
        //   : (Math.round(Math.random() * 16) * streamState.latency.CHAT) / 4;

        setTimeout(() => {
          // io.to(targetId).emit("chatFromServer", chunk);
          // console.log("grid setTimeout");
          if (
            bpmState[targetId].stream.CHAT.gridFlag &&
            !bpmState[targetId].stream.CHAT.quantizeFlag
          ) {
            // console.log("grid emit");
            ioEmitChatFromServer(io, chunk, targetId);
          }
        }, timeOutVal);
      } else {
        ioEmitChatFromServer(io, chunk, targetId);
      }
    } else {
      io.to(targetId).emit("chatReqFromServer");
    }
    // } else {
    //   if (!states.stream.grid.CHAT) {
    //     const crampResult = await switchCramp("CHAT");
    //     if (crampResult) {
    //       await chatEmit(io);
    //     } else {
    //       setTimeout(() => {
    //         chatEmit(io);
    //       }, 500);
    //     }
    //   } else {
    //     const timeOutVal =
    //       (Math.round(Math.random() * 16) * states.stream.latency.CHAT) / 4;
    //     setTimeout(async () => {
    //       const crampResult = await switchCramp("CHAT");
    //       if (crampResult) {
    //         await chatEmit(io);
    //       } else {
    //         setTimeout(() => {
    //           chatEmit(io);
    //         }, 500);
    //       }
    //     }, timeOutVal);
    //   }
    // }
  } else {
    io.emit("erasePrintFromServer");
  }
};

const ioEmitChatFromServer = async (io, chunk, targetId) => {
  // console.log("targetId", targetId);
  // console.log("machine", states.client[targetId]);

  if (streamState.floating && !clientState.client[targetId].projection) {
    // console.log("floating");
    const projectionChunk = {
      ...chunk,
      floating: true,
      position: clientState.client[targetId].position,
      target: targetId,
    };
    const projectionTargetId = Object.keys(clientState.client).find((key) => {
      return clientState.client[key].projection;
    });
    io.to(projectionTargetId).emit("chatFromServer", projectionChunk);
  }

  if (
    clientState.client[targetId] !== undefined &&
    clientState.client[targetId].urlPathName.includes("pi") &&
    arduinoState.connected
  ) {
    const result = await switchCramp("CHAT");
    console.log("switchCramp", result);
  }
  io.to(targetId).emit("chatFromServer", chunk);
};
