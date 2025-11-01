import SocketIO from "socket.io";
import { videoBuffers } from "../../data";
import { clientState } from "../../state";

export const videoReceive = async (
  chunk: Blob,
  isFirstChunk: boolean,
  io: SocketIO.Server
) => {
  if (isFirstChunk) {
    videoBuffers.push(chunk);
  }
  videoBuffers.push(chunk);
  const targetClient = Object.keys(clientState.client)[
    Math.floor(Math.random() * Object.keys(clientState.client).length)
  ];
  console.log(`Sending video chunk to client: ${targetClient}`);
  io.to(targetClient).emit("videoFromServer", chunk);

  // io.emit("videoBufferFromServer", chunk);
};
