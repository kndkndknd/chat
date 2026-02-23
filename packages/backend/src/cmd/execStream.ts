import SocketIO from "socket.io";
import { chatPreparation } from "../stream/chatPreparation";
import { recordEmit } from "../stream/recordEmit";
import { voiceEmit } from "./voiceEmit";
import { streamEmit } from "../stream/streamEmit";
import { streamList } from "../data";

export const execStream = async (
  strings: string,
  io: SocketIO.Server,
  id: string
): Promise<void> => {
  if (strings === "CHAT") {
    chatPreparation(io);
    voiceEmit(io, strings, id);
  } else if (strings === "RECORD" || strings === "REC") {
    recordEmit(io);
    voiceEmit(io, "RECORD", id);
  } else if (streamList.includes(strings)) {
    console.log("in stream");
    streamEmit(strings, io);
    voiceEmit(io, strings, id);
  }
};
