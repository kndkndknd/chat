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
const ioServer_js_1 = require("./socket/ioServer.js");
// import { states } from "./states";
// import { switchCtrl } from "./arduinoAccess/switch";
const os_1 = require("os");
const port = 8000;
const app = (0, express_1.default)();
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// const __dirname = import.meta.dirname;
// console.log(__dirname);
app.use(express_1.default.static(path.join(__dirname, "..", "static")));
app.use((0, serve_favicon_1.default)(path.join(__dirname, "..", "lib/favicon.ico")));
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
(0, ioServer_js_1.ioServer)(httpserver);
//# sourceMappingURL=app.js.map