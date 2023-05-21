import fastify, { FastifyRequest, FastifyReply } from "fastify";
import { findData, insertData } from "./mongo";
//import * as fmp from "@fastify/multipart";
//import multipart from "@fastify/multipart";
import { pipeline, Readable } from "stream";
import util from "util";
const pump = util.promisify(pipeline);

interface streamPost {
  name: string;
  type: string;
  audio: string;
  video: string;
  location: string;
  createdAt: Date;
}

const server = fastify({
  logger: true,
});

server.post("/insert", async (request: FastifyRequest, reply: FastifyReply) => {
  // console.log(request.body);
  try {
    // const { fields, files } = await request.multipart();

    const parsed: streamPost = await JSON.parse(JSON.stringify(request.body));
    const now = new Date();
    parsed.createdAt = now;
    // console.log(parsed);
    const f32a = new Float32Array(new Uint8Array([...atob(parsed.audio)].map(c => c.charCodeAt(0))).buffer);
    console.log(f32a);
    const resultId = await insertData(parsed);
    // const resultId = "debug";
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
    return await reply.status(200).send(resultId);
    //return { result: "ok", dbid: resultId };
  } catch (err) {
    server.log.error(err);
    return reply.status(500).send("error");
  }
});
/*
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
*/

server.listen(3000, "0.0.0.0", (err, address) => {
  if (err) throw err;
  server.log.info(`server listening on ${address}`);
});
