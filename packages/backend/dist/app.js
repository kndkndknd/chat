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
const ioServer_1 = require("./socket/ioServer");
// import { states } from "./states";
// import { switchCtrl } from "./arduinoAccess/switch";
const os_1 = require("os");
const ioEmit_1 = require("./socket/ioEmit");
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
    key: fs.readFileSync(path.join(__dirname, "../../../..", "keys/chat/privkey.pem")),
    cert: fs.readFileSync(path.join(__dirname, "../../../..", "keys/chat/cert.pem")),
};
const httpserver = Https.createServer(options, app).listen(port);
function getIpAddress() {
    const nets = (0, os_1.networkInterfaces)();
    const net = nets["en0"]?.find((v) => v.family == "IPv4");
    return !!net ? net.address : null;
}
const host = getIpAddress();
console.log(`Server listening on ${host}:${port}`);
const io = (0, ioServer_1.ioServer)(httpserver);
app.get("/", function (req, res, next) {
    try {
        res.sendFile(path.join(__dirname, "..", "static", "html", "index.html"));
    }
    catch (error) {
        console.log(error);
        res.json({ success: false, message: "Something went wrong" });
    }
});
app.get("/snowleopard", function (req, res, next) {
    try {
        console.log("snowleopard");
        res.sendFile(path.join(__dirname, "..", "static", "html", "snowleopard.html"));
    }
    catch (error) {
        console.log(error);
        res.json({ success: false, message: "Something went wrong" });
    }
});
app.get("/form", function (req, res, next) {
    try {
        console.log("snowleopard");
        res.sendFile(path.join(__dirname, "..", "static", "html", "form.html"));
    }
    catch (error) {
        console.log(error);
        res.json({ success: false, message: "Something went wrong" });
    }
});
app.get("/hls", function (req, res, next) {
    try {
        console.log("hls test");
        res.sendFile(path.join(__dirname, "..", "static", "html", "hlstest.html"));
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
app.post("/api/form", function (req, res, next) {
    console.log("POST /api/form", req.body);
    if (req.body.enter) {
        console.log("enter");
    }
    else {
        console.log("chat:", req.body.chat);
        (0, ioEmit_1.stringEmit)(io, req.body.chat, false);
    }
    res.json({ success: true, message: "Data received" });
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
//# sourceMappingURL=app.js.map