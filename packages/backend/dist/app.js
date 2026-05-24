"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const express_1 = __importDefault(require("express"));
const path = __importStar(require("path"));
const serve_favicon_1 = __importDefault(require("serve-favicon"));
const Https = __importStar(require("https"));
const wsServer_1 = require("./socket/wsServer");
const os_1 = require("os");
const cmdLogging_1 = require("./logging/cmdLogging");
const data_1 = require("./data");
const state_1 = require("./state");
const ioState_1 = require("./state/states/ioState");
const streamsRedis_1 = require("./redis/streamsRedis");
const clientSettingsEmit_1 = require("./clientSetting/clientSettingsEmit");
const nightSchedule_1 = require("./scenario/nightSchedule");
// import { cors } from "cors";
// const corsOptions = {
//   origin: "http://127.0.0.1:5173",
//   optionsSuccessStatus: 200,
// };
const port = 8888;
const app = (0, express_1.default)();
app.use(express_1.default.json());
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// const __dirname = import.meta.dirname;
// console.log(__dirname);
app.use(express_1.default.static(path.join(__dirname, "..", "static")));
app.use((0, serve_favicon_1.default)(path.join(__dirname, "..", "lib/favicon.ico")));
const allowCrossDomain = function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, access_token");
    // intercept OPTIONS method
    if ("OPTIONS" === req.method) {
        res.send(200);
    }
    else {
        next();
    }
};
app.use(allowCrossDomain);
//const httpsserver = Https.createServer(options,app).listen(port);
const options = {
    key: fs.readFileSync(path.join(__dirname, "../../../../..", "keys/chat/private.key")),
    cert: fs.readFileSync(path.join(__dirname, "../../../../..", "keys/chat/selfsigned.crt")),
    passphrase: "chat",
};
const httpserver = Https.createServer(options, app).listen(port);
function getIpAddress() {
    const nets = (0, os_1.networkInterfaces)();
    const net = nets["en0"]?.find((v) => v.family == "IPv4");
    return !!net ? net.address : null;
}
const host = getIpAddress();
console.log(`Server listening on ${host}:${port}`);
(0, wsServer_1.wsServer)(httpserver);
app.get("/", function (req, res, next) {
    try {
        res.sendFile(path.join(__dirname, "..", "static", "html", "index.html"));
    }
    catch (error) {
        console.log(error);
        res.json({ success: false, message: "Something went wrong" });
    }
});
app.get("/vosk", function (req, res, next) {
    try {
        console.log("vosk");
        res.sendFile(path.join(__dirname, "..", "static", "html", "vosk.html"));
    }
    catch (error) {
        console.log(error);
        res.json({ success: false, message: "Something went wrong" });
    }
});
app.get("/rotate", function (req, res, next) {
    try {
        res.sendFile(path.join(__dirname, "..", "static", "html", "rotate.html"));
    }
    catch (error) {
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
    }
    catch (error) {
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
    const body = req.body;
    console.log(JSON.parse(JSON.stringify(body)));
    if (nightSchedule_1.nightScheduleState.quiet) {
        res.json({ success: true, skipped: true });
        return;
    }
    ioState_1.ioState.io?.emit("personDetectFromServer");
    if (body.direction === "left") {
        (0, clientSettingsEmit_1.triggerLeftPersonDetect)();
        streamsRedis_1.countersRedis.increment("visitor").then((count) => {
            console.log("visitor count:", count);
        });
    }
    if (body.direction === "right") {
        streamsRedis_1.countersRedis.increment("leave").then((count) => {
            console.log("leave count:", count);
        });
    }
    res.json({ success: true });
});
(0, state_1.loadAllStates)()
    .then(() => (0, data_1.initStreams)())
    .catch((err) => console.error("Redis init error:", err));
(0, cmdLogging_1.cmdLogging)("START");
(0, nightSchedule_1.startNightSchedule)();
//# sourceMappingURL=app.js.map