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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ioServer = void 0;
const express_1 = __importDefault(require("express"));
const Http = __importStar(require("http"));
const socket_io_1 = require("socket.io");
const mongo_1 = require("./mongo");
const app = (0, express_1.default)();
const port = 3000;
//const httpsserver = Https.createServer(options,app).listen(port);
const httpserver = Http.createServer(app).listen(port);
const ioServer = (httpserver) => {
    const io = new socket_io_1.Server(httpserver);
    io.sockets.on("connection", (socket) => {
        socket.on("streamPost", (data) => __awaiter(void 0, void 0, void 0, function* () {
            console.log(data);
            const now = new Date();
            let stream = {
                type: data.type,
                video: data.video,
                audio: data.audio,
                location: data.location,
                createdAt: now,
            };
            const resultId = yield (0, mongo_1.insertData)(stream);
            console.log("return ", resultId);
            socket.emit("streamPostResult", resultId);
        }));
        socket.on("disconnect", () => {
            console.log("disconnect: " + String(socket.id));
        });
    });
};
exports.ioServer = ioServer;
