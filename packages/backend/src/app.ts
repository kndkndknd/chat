import * as fs from "fs";
import { default as Express } from "express";
import * as path from "path";
import { default as favicon } from "serve-favicon";
import * as Https from "https";
import { wsServer } from "./socket/wsServer";
import { networkInterfaces } from "os";
import dotenv from "dotenv";

const dotenvPath = path.join(__dirname, "../../..", ".env");
if (fs.existsSync(dotenvPath)) {
  console.log("Loading .env file from:", dotenvPath);
  dotenv.config({ path: dotenvPath });
}

import { cmdLogging } from "./logging/cmdLogging";
import { initStreams } from "./data";
import { loadAllStates, clientState, sampleRateState, cmdState } from "./state";
import { ioState } from "./state/states/ioState";
import { countersRedis, streamsRedis } from "./redis/streamsRedis";
import {
  nightScheduleState,
  startNightSchedule,
} from "./scenario/nightSchedule";
// import { getMongoDb } from "./mongo/client";
// import {
//   importStreamToMongo,
//   importAllStreamsToMongo,
//   REDIS_TO_MONGO_ALLOWED,
// } from "./mongo/redisToMongo";
import {
  halveStreamByRecordIndex,
  HALVE_ALLOWED,
} from "./redis/halveByRecordIndex";
import {
  scenarioItsuki,
  isScenarioItsukiActive,
  stopScenarioItsuki,
} from "./scenario/scenarioItsuki";
import { stopAllScenarioTimers } from "./scenario/execScenario";
import {
  enableNightMode,
  disableNightMode,
  isNightModeActive,
} from "./nightMode/nightMode";

// import { cors } from "cors";
// const corsOptions = {
//   origin: "http://127.0.0.1:5173",
//   optionsSuccessStatus: 200,
// };

const scenarioMode = process.env.SCENARIO === "true";
const port = process.env.LOCAL_SERVER_PORT || 8888;
const app = Express();
app.use(Express.json());
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
    "Content-Type, Authorization, access_token"
  );
  // intercept OPTIONS method
  if ("OPTIONS" === req.method) {
    res.sendStatus(200);
  } else {
    next();
  }
};
app.use(allowCrossDomain);

//const httpsserver = Https.createServer(options,app).listen(port);
const options = {
  key: fs.readFileSync(
    path.join(__dirname, "../../../..", "keys/chat/private.key")
  ),
  cert: fs.readFileSync(
    path.join(__dirname, "../../../..", "keys/chat/selfsigned.crt")
  ),
  passphrase: "chat",
};

function getIpAddress() {
  const nets = networkInterfaces();
  const net = nets["en0"]?.find((v) => v.family == "IPv4");
  return !!net ? net.address : null;
}

const httpserver = Https.createServer(options, app);

// bind に成功したときだけ listening を表示する。
httpserver.listen(port, () => {
  const host = getIpAddress();
  console.log(`Server listening on ${host}:${port}`);
});

// ポート使用中(EADDRINUSE)などの bind 失敗を握りつぶさず、明示して終了する。
httpserver.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Server not started.`);
  } else {
    console.error("HTTP server error:", err);
  }
  process.exit(1);
});

// 起動時に一度だけ Mongo へ接続し、疎通を確認する。
// getMongoDb().catch((err) => {
//   console.error("Mongo initial connection failed:", err);
// });

wsServer(httpserver);

app.get("/", function (req, res, next) {
  try {
    res.sendFile(path.join(__dirname, "..", "static", "html", "index.html"));
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


// app.post("/api/char", function (req, res, next) {
//   console.log("POST /api/char", req.body);
//   console.log("ip:", req.ip);
//   res.json({ success: true, message: "char received" });
// });

// app.post("/api/persondetect", function (req, res) {
//   const body: { type: string; direction: string } = req.body;
//   console.log(JSON.parse(JSON.stringify(body)));
//   if (nightScheduleState.quiet) {
//     res.json({ success: true, skipped: true });
//     return;
//   }
//   ioState.io?.emit("personDetectFromServer");
//   if (body.direction === "left") {
//     countersRedis.increment("visitor").then((count) => {
//       console.log("visitor count:", count);
//     });
//   }
//   if (body.direction === "right") {
//     countersRedis.increment("leave").then((count) => {
//       console.log("leave count:", count);
//     });
//   }
//   res.json({ success: true });
// });

// シナリオ（scenarioItsuki）を HTTP から起動する。
// 実行中だった場合は一度停止してから再度実行する。
app.post("/api/scenario", async function (req, res) {
  try {
    const wasActive = isScenarioItsukiActive();
    if (wasActive) {
      console.log("[POST /api/scenario] scenarioItsuki active, restarting");
      stopScenarioItsuki();
    }
    await scenarioItsuki();
    res.json({ success: true, restarted: wasActive });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
});


// CLEAR BUFFER 相当の処理を HTTP から実行する。
// body.stream を省略すると全ストリームのバッファをクリア（CHAT/EMPTY/KICK/SNARE/HAT は除外）、
// 指定すると該当ストリームのバッファのみクリアする。
app.post("/api/clear-buffer", async function (req, res) {
  const stream: string | undefined = req.body?.stream;
  const excluded = ["CHAT", "EMPTY", "KICK", "SNARE", "HAT"];
  try {
    if (stream === undefined) {
      const allKeys = await streamsRedis.getAllKeys();
      const cleared: string[] = [];
      for (const name of allKeys) {
        if (!excluded.includes(name)) {
          await streamsRedis.clear(name);
          cleared.push(name);
        }
      }
      res.json({ success: true, cleared });
    } else if (await streamsRedis.hasKey(stream)) {
      await streamsRedis.clear(stream);
      res.json({ success: true, cleared: [stream] });
    } else {
      res
        .status(404)
        .json({ success: false, message: `Stream not found: ${stream}` });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
});

// Redis 上の streamBuffer を Mongo へ取り込む（scripts/redisToMongo.ts 相当）。
// body.stream を省略すると PLAYBACK / TIMELAPSE の両方を取り込む。
// 指定する場合は PLAYBACK / TIMELAPSE のいずれかのみ許可する。
// 同一 timestamp が Mongo 側に既に存在するドキュメントはスキップする。
// app.post("/api/redis-to-mongo", async function (req, res) {
//   const stream: string | undefined = req.body?.stream;
//   try {
//     if (stream === undefined) {
//       const results = await importAllStreamsToMongo();
//       res.json({ success: true, results });
//     } else if (
//       REDIS_TO_MONGO_ALLOWED.includes(
//         stream as (typeof REDIS_TO_MONGO_ALLOWED)[number],
//       )
//     ) {
//       const result = await importStreamToMongo(stream);
//       res.json({ success: true, results: [result] });
//     } else {
//       res.status(400).json({
//         success: false,
//         message: `対象は ${REDIS_TO_MONGO_ALLOWED.join(" / ")} のみです: ${stream}`,
//       });
//     }
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ success: false, message: "Something went wrong" });
//   }
// });


loadAllStates()
  .then(() => {
    // サーバ起動時は randomrate を CHAT/PLAYBACK/TIMELAPSE について必ず true にする
    // sampleRateState.randomrate.CHAT = true;
    // sampleRateState.randomrate.PLAYBACK = true;
    // sampleRateState.randomrate.TIMELAPSE = true;
    cmdState.CLICKFREQ = 440;
  })
  .then(() => initStreams())
  .catch((err) => console.error("Redis init error:", err));
cmdLogging("START");
if(scenarioMode){
  console.log("Scenario mode enabled");
  startNightSchedule();
} else {
  console.log("Scenario mode disabled");
}
