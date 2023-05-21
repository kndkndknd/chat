import fastify, { FastifyRequest, FastifyReply } from "fastify";
import { findData, insertData } from "./mongo";
//import * as fmp from "@fastify/multipart";
//import multipart from "@fastify/multipart";
import fmp from "@fastify/multipart";
import { pipeline, Readable } from "stream";
import util from "util";
const pump = util.promisify(pipeline);

interface streamPost {
  name: string;
  type: string;
  audio: Float32Array;
  video: string;
  location: string;
}

interface streamGet {
  type: string;
  location: string;
}

const server = fastify({
  logger: true,
});

server.register(fmp);

server.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
  return { hello: "world" };
});
/*
server.get<{ Querystring: streamGet }>(
  "/api/stream",
  async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { type, location } = request.query;
      const result = await findData(type, location);
      return reply.status(200).send(result);
    } catch (err) {
      server.log.error(err);
      return reply.status(500).send("error");
    }
  }
);
*/

server.post("/api/stream", async (request: FastifyRequest, reply: FastifyReply) => {
  // console.log(request.body);
  const now = new Date();
  let obj = {
    name: "test",
    type: "test",
    video: "test",
    location: "test",
    // audio: new Buffer("test"),
  };
  try {
    const parts = await request.files();
    // const { fields, files } = await request.multipart();
    const resultId = "debug";
    // console.log(parts);
    for await (const part of parts) {
      // console.log(part);
      // console.log(part.type);
      // console.log(part.mimetype);
      if (part.mimetype === "application/json") {
        if (part.type === "file") {
          // console.log(part.file);
        }
        const json = await part.toBuffer();
        console.log(JSON.parse(json.toString()));
        //const body: string = await part.file.;
        // console.log(JSON.parse(body));
      } else if (part.mimetype === "application/octet-stream") {
        const body: Buffer = await getBufferFromStream(part.file);
        // obj.audio = body;
        // const audio = new Float32Array(body);
        console.log(body);
      } else {
      }
      console.log(obj);
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
  } catch (err) {
    server.log.error(err);
    return reply.status(500).send("error");
  }
});

async function getBufferFromStream(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    stream.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    stream.on("error", (err: Error) => {
      reject(err);
    });

    stream.on("end", () => {
      const buffer: Buffer = Buffer.concat(chunks);
      resolve(buffer);
    });
  });
}

server.listen(3000, "0.0.0.0", (err, address) => {
  if (err) throw err;
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
