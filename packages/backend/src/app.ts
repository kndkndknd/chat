import * as fs from "fs";
import { default as Express } from "express";
import * as path from "path";
import { default as favicon } from "serve-favicon";
import * as Https from "https";
import { wsServer } from "./socket/wsServer";

import { networkInterfaces } from "os";


import { cmdLogging } from "./logging/cmdLogging";
import { initStreams } from "./data";
import { loadAllStates } from "./state";
import { ioState } from "./state/states/ioState";
import { countersRedis } from "./redis/streamsRedis";
import { triggerLeftPersonDetect } from "./clientSetting/clientSettingsEmit";

// import { cors } from "cors";
// const corsOptions = {
//   origin: "http://127.0.0.1:5173",
//   optionsSuccessStatus: 200,
// };

const port = 8888;
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
    res.send(200);
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

const httpserver = Https.createServer(options, app).listen(port);

function getIpAddress() {
  const nets = networkInterfaces();
  const net = nets["en0"]?.find((v) => v.family == "IPv4");
  return !!net ? net.address : null;
}

const host = getIpAddress();
console.log(`Server listening on ${host}:${port}`);

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


app.post("/api/char", function (req, res, next) {
  console.log("POST /api/char", req.body);
  console.log("ip:", req.ip);
  res.json({ success: true, message: "char received" });
});

app.post("/api/persondetect", function (req, res) {
  const body: { type: string; direction: string } = req.body;
  console.log(JSON.parse(JSON.stringify(body)));
  ioState.io?.emit("personDetectFromServer");
  if (body.direction === "left") {
    triggerLeftPersonDetect();
    countersRedis.increment("visitor").then((count) => {
      console.log("visitor count:", count);
    });
  }
  if (body.direction === "right") {
    countersRedis.increment("leave").then((count) => {
      console.log("leave count:", count);
    });
  }
  res.json({ success: true });
});

loadAllStates()
  .then(() => initStreams())
  .catch((err) => console.error("Redis init error:", err));
cmdLogging("START");
