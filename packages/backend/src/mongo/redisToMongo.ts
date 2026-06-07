import { redis } from "../redis/client";
import { buffKey } from "../redis/streamsRedis";
import { getMongoDb } from "./client";

// 取り込み対象の streamBuffer は PLAYBACK / TIMELAPSE のみに限定する。
export const REDIS_TO_MONGO_ALLOWED = ["PLAYBACK", "TIMELAPSE"] as const;

export type ImportStreamResult = {
  stream: string;
  inserted: number;
  skipped: number;
};

// flushStreams.ts と同じマッピング: Redis に保存された生 JSON を Mongo ドキュメントへ変換する。
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
    recordIndex: obj.recordIndex,
  };
};

// streamBuffer(name) を collection(name) に取り込む。
// 同一 timestamp が Mongo 側に既に存在する場合はそのドキュメントをスキップする。
export const importStreamToMongo = async (
  name: string,
): Promise<ImportStreamResult> => {
  const raws = await redis.lrange(buffKey(name), 0, -1);
  if (raws.length === 0) {
    console.log(`[redisToMongo] ${name}: redis empty, skip`);
    return { stream: name, inserted: 0, skipped: 0 };
  }

  const db = await getMongoDb();
  const col = db.collection(name);

  // Mongo 側に既に存在する timestamp の集合を取得しておく。
  const existing = await col
    .find({ timestamp: { $exists: true } }, { projection: { timestamp: 1, _id: 0 } })
    .toArray();
  const seen = new Set<number>();
  for (const d of existing) {
    if (d.timestamp !== undefined && d.timestamp !== null) seen.add(d.timestamp);
  }

  const docs: ReturnType<typeof rawToDoc>[] = [];
  let skipped = 0;
  for (const raw of raws) {
    const doc = rawToDoc(raw);
    // timestamp を持たないものは重複判定できないのでそのまま取り込む。
    if (doc.timestamp !== undefined && doc.timestamp !== null) {
      if (seen.has(doc.timestamp)) {
        skipped++;
        continue;
      }
      // 同一実行内での重複も避ける。
      seen.add(doc.timestamp);
    }
    docs.push(doc);
  }

  if (docs.length === 0) {
    console.log(
      `[redisToMongo] ${name}: nothing to insert (skipped ${skipped} duplicate timestamps)`,
    );
    return { stream: name, inserted: 0, skipped };
  }

  await col.insertMany(docs);
  console.log(
    `[redisToMongo] ${name}: inserted ${docs.length} docs, skipped ${skipped} duplicate timestamps`,
  );
  return { stream: name, inserted: docs.length, skipped };
};

// PLAYBACK / TIMELAPSE をまとめて Mongo へ取り込む。
export const importAllStreamsToMongo = async (): Promise<ImportStreamResult[]> => {
  const results: ImportStreamResult[] = [];
  for (const name of REDIS_TO_MONGO_ALLOWED) {
    results.push(await importStreamToMongo(name));
  }
  return results;
};
