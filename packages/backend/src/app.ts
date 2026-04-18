import * as fs from "fs";
import { default as Express } from "express";
import express from "express";
import * as path from "path";
import { default as favicon } from "serve-favicon";
import * as Https from "https";
import * as http from "http";
import { networkInterfaces } from "os";
import SocketIO from "socket.io";

import { stringEmit } from "./socket/ioEmit";

import { WebSocketServer, WebSocket } from "ws";
import { webSocketState } from "./state/states/webSocketState";
import { receiveMessage } from "./webSocket";
import { charProcess } from "./cmd/charProcess";
import { connectClient } from "./clientProcess/connectClient";
import { disconnectClient } from "./clientProcess/disconnectClient"

import { buffStateType } from "../../../types/streamType";
import { receiveStream } from "./stream/receiveStream";
import { reqStream } from "./stream/reqStream";

// import { io as socketIoClient, Socket } from "socket.io-client";

// const socketClient: Socket = socketIoClient("https://localhost:8080/socket.io");

// socketClient.on("connect", () => {
//   console.log("Connected to server" + socketClient.id);
// });

// import { cors } from "cors";
// const corsOptions = {
//   origin: "http://127.0.0.1:5173",
//   optionsSuccessStatus: 200,
// };

const port = 8888;
const app = Express();
app.use(Express.json({limit: '50mb' }));
app.use(Express.urlencoded({ limit: '50mb', extended: true }));
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// const __dirname = import.meta.dirname;
// console.log(__dirname);

app.use(Express.static(path.join(__dirname, "..", "static")));
app.use(favicon(path.join(__dirname, "..", "lib/favicon.ico")));

const allowCrossDomain = function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, access_token",
  );
  // intercept OPTIONS method
  if ("OPTIONS" === req.method) {
    res.send(200);
  } else {
    next();
  }
};
app.use(allowCrossDomain);

//const httpsserver = Https.createServer(options,app).listen(port);
const options = {
  key: fs.readFileSync(
    path.join(__dirname, "../../../..", "keys/chat/private.key"),
  ),
  cert: fs.readFileSync(
    path.join(__dirname, "../../../..", "keys/chat/selfsigned.crt"),
  ),
  passphrase: "chat",
};

const httpserver = Https.createServer(options, app).listen(port);

function getIpAddress() {
  const nets = networkInterfaces();
  const net = nets["en0"]?.find((v) => v.family == "IPv4");
  return !!net ? net.address : null;
}

const host = getIpAddress();
console.log(`Server listening on ${host}:${port}`);

// webSocket(io);

webSocketState.wss = new WebSocketServer({ server: httpserver });

webSocketState.wss.on("connection", (ws: WebSocket, request: http.IncomingMessage) => {
  // const clientId = randomUUID();
  // const clientIdObj = { id: String(clientId), ws, ip: request.socket.remoteAddress ?? "" };
  // console.log(clientIdObj);
  // webSocketState.clientId.push(clientIdObj);

  connectClient(request.socket.remoteAddress ?? "", ws);  

  ws.on("message", (data) => {
    receiveMessage(data, ws);
  });

  ws.on("close", () => {
    disconnectClient(ws);
    // webSocketState.clientId = webSocketState.clientId.filter(
    //   (client) => client.ws !== ws,
    // );
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

app.get("/", function (req, res, next) {
  try {
    res.sendFile(path.join(__dirname, "..", "static", "html", "index.html"));
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Something went wrong" });
  }
});

app.get("/snowleopard", function (req, res, next) {
  try {
    console.log("snowleopard");
    res.sendFile(
      path.join(__dirname, "..", "static", "html", "snowleopard.html"),
    );
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Something went wrong" });
  }
});

app.get("/vosk", function (req, res, next) {
  try {
    console.log("vosk");
    res.sendFile(path.join(__dirname, "..", "static", "html", "vosk.html"));
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Something went wrong" });
  }
});

app.get("/rotate", function (req, res, next) {
  try {
    res.sendFile(path.join(__dirname, "..", "static", "html", "rotate.html"));
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Something went wrong" });
  }
});

app.get("/form", function (req, res, next) {
  try {
    console.log("snowleopard");
    res.sendFile(path.join(__dirname, "..", "static", "html", "form.html"));
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Something went wrong" });
  }
});

app.get("/ws", function (req, res, next) {
  try {
    console.log("ws test");
    res.sendFile(path.join(__dirname, "..", "static", "html", "wsClient.html"));
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Something went wrong" });
  }
});

// app.get("/recorder", function (req, res, next) {
//   try {
//     console.log("recorder");
//     res.sendFile(path.join(__dirname, "..", "static", "html", "recorder.html"));
//   } catch (error) {
//     console.log(error);
//     res.json({ success: false, message: "Something went wrong" });
//   }
// });

// import { ingest, stopIngesting } from "./recorder";

// app.post(
//   "/api/ingest",
//   express.raw({
//     // type: ["video/webm", "application/octet-stream"],
//     type: "video/webm",
//     limit: "25mb",
//   }),
//   async (req, res, next) => {
//     // await console.log(req.body);
//     try {
//       if (!Buffer.isBuffer(req.body)) {
//         return res.status(415).send("unsupported media type");
//       }
//       const chunk: Buffer = req.body as Buffer;
//       console.log("ingest chunk size:", chunk.length);

//       const filename = (req.header("x-filename") ?? "upload.bin").toString();
//       const mime = req.header("content-type") ?? "application/octet-stream";
//       console.log("bytes:", chunk.length, "mime:", mime, "filename:", filename);

//       await ingest(chunk);
//       res.json({ ok: true });
//     } catch (error) {
//       next(error);
//     }
//   }
// );

// app.post("/api/stop", async (_req, res) => {
//   await stopIngesting();
//   await res.json({ ok: true });
// });

app.get("/:name", function (req, res, next) {
  const name = req.params.name;
  try {
    // if (name == "" || name === "pi" || name === "pi5") {
    res.sendFile(path.join(__dirname, "..", "static", "html", "index.html"));
    // } else if (
    //   name == "snowleopard" ||
    //   name == "sl" ||
    //   name === "snow" ||
    //   name == "2008" ||
    //   name == "2009"
    // ) {
    //   res.sendFile(
    //     path.join(__dirname, "..", "static", "html", "snowleopard.html")
    //   );
    // }
    // res.sendFile(path.join(__dirname, "..", "static", "html", "index.html"));
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Something went wrong" });
  }
});

app.post("/api/form", function (req, res, next) {
  console.log("POST /api/form", req.body);
  if (req.body.enter) {
    console.log("enter");
  } else {
    console.log("chat:", req.body.chat);
    stringEmit(req.body.chat, false);
  }
  res.json({ success: true, message: "Data received" });
});

app.post("/api/char", function (req, res, next) {
  const char = <string>req.body.char;
  const ip = req.ip;
  const id = webSocketState.clientId.find((client) => client.ip === ip)?.id;
  if (!id) {
    console.error("Client ID not found for IP:", ip);
    return res.status(400).json({ success: false, message: "Client ID not found" });
  } else {
    charProcess(char, id);
  }
  // console.log("POST /api/char", req.body);
  // console.log("ip:", req.ip);
  res.json({ success: true, message: "char received" });
});

app.post("/api/chunk", function (req, res, next) {
  // console.log("POST /api/chunk", req.body);
  // console.log("ip:", req.ip);
  const stream: buffStateType = req.body;
  receiveStream(stream);
  // console.log("chunk added to chats, total chunks:", chats.length);
  res.json({ success: true, message: "chunk received" });
});

let i = 0;

app.post("/api/streamReq", function (req, res, next) {
  console.log("POST /api/streamReq", req.body);
  console.log("ip:", req.ip);
  console.log("streamReq count:", ++i);
  const { source } = req.body;
  const ip = req.ip;
  reqStream(source, ip);
  res.json({ success: true, message: "streamReq received" });
});

app.post("/api/videoBuffer", function (req, res, next) {
  console.log("POST /api/videoBuffer", req.body);
  console.log("ip:", req.ip);
  res.json({ success: true, message: "videoBuffer received" });
});


// person detection test
app.post("/api/personDetection", function (req, res, next) {
  console.log("POST /api/personDetection", req.body);
  console.log("ip:", req.ip);
  res.json({ success: true, message: "personDetection received" });
});
/*
const socketOptions = {
  cors: {
    origin: function (origin, callback) {
      const isTarget = origin != undefined && origin.includes("localhost") !== null;
      return isTarget ? callback(null, origin) : callback('error invalid domain');
    },
    credentials: true
  },
  maxHttpBufferSize: 1e8,
};
*/

// const io = new Server(httpsserver, socketOptions)
