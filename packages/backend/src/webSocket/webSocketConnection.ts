import WebSocket from "ws";
import * as Https from "https";
import SocketIO from "socket.io";

import dotenv from "dotenv";
dotenv.config();

import { webSocketIdState } from "../state";
import { receiveEnter } from "../cmd/receiveEnter";

const serverUrl = "https://" + process.env.WEB_HOST;
const wsUrl = "wss://" + process.env.WEB_HOST;

export const webSocketServerInfo = {
  serverUrl,
  wsUrl,
  connect: false,
};

// WebSocket接続を行う関数
function connectWebSocket(url: string, io: SocketIO.Server) {
  const ws = new WebSocket(url);

  ws.on("open", () => {
    console.log("WebSocket connection opened");
    // メッセージをサーバに送信
    // ws.send("Hello Server!");
    // ws.send(JSON.stringify({ type: "register", id: "server" }));
  });

  ws.on("message", (message) => {
    console.log("Received from server:", message.toString());
    const data = JSON.parse(message.toString());
    if (data.type === "register") {
      if (data.clientId) {
        webSocketIdState.set(data.clientId, ws);
      }
    } else if (data.type === "char") {
      console.log(data);
    } else if (data.type === "cmd") {
      receiveEnter(data.cmd, "", io);
      console.log("cmd", data.cmd);
    } else if (data.type === "sinewave") {
      receiveEnter(data.frequency, "", io);
      console.log("sinewave", data.frequency);
    } else if (data.type === "stop") {
      receiveEnter("STOP", "", io);
      console.log("stop", data);
    } else if (data.type === "chat") {
      receiveEnter("CHAT", "", io);
      console.log("CHAT", data);
    }
  });

  ws.on("close", () => {
    console.log("WebSocket connection closed");
    setTimeout(() => {
      console.log("Reconnecting...");
      connectWebSocket(url, io);
    }, 1000);
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
    ws.close();
    setTimeout(() => {
      console.log("Reconnecting...");
      connectWebSocket(url, io);
    }, 1000);
  });
}

// メイン処理
export async function webSocket(io: SocketIO.Server) {
  // const isServerAvailable = await checkServerConnection(serverUrl);
  // if (isServerAvailable) {
  //   console.log("Server is available. Connecting to WebSocket...");
  webSocketServerInfo.connect = true;
  connectWebSocket(wsUrl, io);
  // } else {
  //   console.error("Server is not available. Cannot connect to WebSocket.");
  // }
}

// サーバに接続可能か確認する関数
function checkServerConnection(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = Https.get(url, (res) => {
      // ステータスコード200（OK）の場合は接続可能
      resolve(res.statusCode === 200);
    });

    req.on("error", () => {
      resolve(false);
    });

    req.end();
  });
}

// const webSocket = new WebSocket("wss://localhost:8080", {
//   perMessageDeflate: false,
//   rejectUnauthorized: false,
// });
// webSocket.onopen = () => {
//   console.log("WebSocket connected");
// };

// webSocket.onmessage = (message) => {
//   console.log(`Received: ${message.data}`);
// };

// webSocket.onclose = () => {
//   console.log("WebSocket closed");
// };
