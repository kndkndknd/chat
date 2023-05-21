"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const mongo_1 = require("./mongo");
//import * as fmp from "@fastify/multipart";
const multipart_1 = __importDefault(require("@fastify/multipart"));
const stream_1 = require("stream");
const util_1 = __importDefault(require("util"));
const pump = util_1.default.promisify(stream_1.pipeline);
const server = (0, fastify_1.default)({
    logger: true,
});
server.register(multipart_1.default);
server.get("/", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    return { hello: "world" };
}));
server.get("/api/stream", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { type, location } = request.query;
        const result = yield (0, mongo_1.findData)(type, location);
        return reply.status(200).send(result);
    }
    catch (err) {
        server.log.error(err);
        return reply.status(500).send("error");
    }
}));
server.post("/api/stream", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, e_1, _b, _c;
    // console.log(request.body);
    const now = new Date();
    let obj = {
        type: "test",
        video: "test",
        location: "test",
        audio: new Buffer("test"),
    };
    try {
        const parts = yield request.files();
        // const { fields, files } = await request.multipart();
        const resultId = "debug";
        try {
            // console.log(parts);
            for (var _d = true, parts_1 = __asyncValues(parts), parts_1_1; parts_1_1 = yield parts_1.next(), _a = parts_1_1.done, !_a;) {
                _c = parts_1_1.value;
                _d = false;
                try {
                    const part = _c;
                    // console.log(part);
                    // console.log(part.type);
                    // console.log(part.mimetype);
                    if (part.mimetype === "application/json") {
                        if (part.type === "file") {
                            // console.log(part.file);
                        }
                        const json = yield part.toBuffer();
                        console.log(JSON.parse(json.toString()));
                        //const body: string = await part.file.;
                        // console.log(JSON.parse(body));
                    }
                    else if (part.mimetype === "application/octet-stream") {
                        const body = yield getBufferFromStream(part.file);
                        obj.audio = body;
                        const audio = new Float32Array(body);
                        console.log(body);
                    }
                    else {
                    }
                    console.log(obj);
                }
                finally {
                    _d = true;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_d && !_a && (_b = parts_1.return)) yield _b.call(parts_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        /*
        const audio = new Float32Array(data.files["audio"].toBuffer());
        console.log(audio);
        console.log(data.files["json"]);
        */
        /*
        const binary = request.files["audio"].toBuffer();
        const json = request.
        const parsed: streamPost = JSON.parse(JSON.stringify(request.body));
        */
        //console.log(parsed);
        //const json = JSON.parse(request.body);
        /*
        console.log(parsed.audio);
        const now = new Date();
        const resultId = await insertData({
          type: parsed.type,
          audio: parsed.audio,
          video: parsed.video,
          location: parsed.location,
          createdAt: now,
        });
        console.log(`return ${resultId}`);
        */
        return reply.status(200).send(resultId);
        //return { result: "ok", dbid: resultId };
    }
    catch (err) {
        server.log.error(err);
        return reply.status(500).send("error");
    }
}));
function getBufferFromStream(stream) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const chunks = [];
            stream.on("data", (chunk) => {
                chunks.push(chunk);
            });
            stream.on("error", (err) => {
                reject(err);
            });
            stream.on("end", () => {
                const buffer = Buffer.concat(chunks);
                resolve(buffer);
            });
        });
    });
}
server.listen(3000, "0.0.0.0", (err, address) => {
    if (err)
        throw err;
    server.log.info(`server listening on ${address}`);
});
/*
const start = async () => {
  try {
    await server.listen({ port: 3000, address: '0.0.0.0'});
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
*/
