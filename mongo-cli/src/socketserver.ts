import express from "express";
import * as Http from "http";
import { Server, Socket } from "socket.io";
import { findData, insertData } from "./mongo";

const app = express();
const port = 3000;
//const httpsserver = Https.createServer(options,app).listen(port);
const httpserver = Http.createServer(app).listen(port);

export const ioServer = (
  httpserver: Http.Server<
    typeof Http.IncomingMessage,
    typeof Http.ServerResponse
  >
) => {
  const io = new Server(httpserver);

  io.sockets.on("connection", (socket) => {
    socket.on("streamPost", async (data) => {
      console.log(data);
      const now = new Date();
      let stream = {
        type: data.type,
        video: data.video,
        audio: data.audio,
        location: data.location,
        createdAt: now,
      };
      const resultId = await insertData(stream);
      console.log("return ", resultId);
      socket.emit("streamPostResult", resultId);
    });

    socket.on("disconnect", () => {
      console.log("disconnect: " + String(socket.id));
    });
  });
};
