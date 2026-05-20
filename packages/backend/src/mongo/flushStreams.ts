import { redis } from "../redis/client";
import { streamsRedis, buffKey } from "../redis/streamsRedis";
import { getMongoDb } from "./client";

const rawToDoc = (raw: string) => {
  const obj = JSON.parse(raw);
  return {
    source: obj.source,
    audio: Buffer.from(obj.audio ?? "", "base64"),
    video: obj.video,
    bufferSize: obj.bufferSize,
    duration: obj.duration,
    from: obj.from,
    floating: obj.floating,
    filter: obj.filter,
    timestamp: obj.timestamp,
  };
};

export const flushStreamToMongo = async (name: string): Promise<number> => {
  const raws = await redis.lrange(buffKey(name), 0, -1);
  if (raws.length === 0) {
    console.log(`[flushStreamToMongo] ${name}: empty, skip`);
    return 0;
  }

  const db = await getMongoDb();
  const docs = raws.map(rawToDoc);
  await db.collection(name).insertMany(docs);
  await streamsRedis.clear(name);
  console.log(`[flushStreamToMongo] ${name}: inserted ${docs.length} docs, redis cleared`);
  return docs.length;
};

export const flushPlaybackAndTimelapse = async (): Promise<void> => {
  for (const name of ["PLAYBACK", "TIMELAPSE"]) {
    try {
      await flushStreamToMongo(name);
    } catch (e) {
      console.error(`[flushStreamToMongo] ${name} failed:`, e);
    }
  }
};
