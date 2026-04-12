import { buffStateType } from "../../../../types";
import { chats, streams} from "../data/chunk/streams";
import { 
  streamState,
} from "../state";
import { emitChat } from "./chat/emitChat";
import { pushStateStream } from "./pushStateStream";

export const receiveStream = async (buffer: buffStateType) => {
  if (buffer === undefined) {
    console.error("Received undefined buffer");
    return;
  }
  switch (buffer.source) {
    case "CHAT":
      chats.push(buffer);
      console.log("chat length: ", chats.length);
      if(buffer.from !== undefined) {
        emitChat(buffer.from);
      } else {
        emitChat();
      }
      break;
    case "PLAYBACK": //RECORDコマンドからのチャンク受信
      streams.PLAYBACK.audio.push(buffer.audio);
      if(buffer.video) {
        streams.PLAYBACK.video.push(buffer.video);
      }
      streams.PLAYBACK.bufferSize = buffer.bufferSize;
      console.log("PLAYBACK.length:" + String(streams.PLAYBACK.audio.length));
      break;
    case "TIMELAPSE":
      streams.TIMELAPSE.audio.push(buffer.audio);
      if(buffer.video) {
        streams.TIMELAPSE.video.push(buffer.video);
      }
      streams.TIMELAPSE.bufferSize = buffer.bufferSize;
      console.log(
        "TIMELAPSE.length:" + String(streams.TIMELAPSE.audio.length)
      );
      break;
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
      if(buffer.video) {
        streams[buffer.source].video.push(buffer.video);
      }
      pushStateStream(buffer.source);
  }
};
