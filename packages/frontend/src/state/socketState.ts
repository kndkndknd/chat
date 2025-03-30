import { Socket } from "socket.io-client";

export const socketState = {
  socket: null as Socket | null,
  socketId: null as string | null,
};
