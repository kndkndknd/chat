/**
 * redisToMongo.ts
 *
 * docker/docker-compose.yml で定義されている Redis 上の streamBuffer を読み出し、
 * ../../docker/mongo で定義されている MongoDB に取り込むスクリプト。
 *
 *  - データベース : itsuki  (env: MONGO_DB)
 *  - Redis streamBuffer "PLAYBACK"  -> Mongo collection "PLAYBACK"
 *  - Redis streamBuffer "TIMELAPSE" -> Mongo collection "TIMELAPSE"
 *
 * Mongo 側に同一の timestamp を持つドキュメントが既に存在する場合は取り込みをスキップする。
 *
 * 実行:
 *   cd packages/backend
 *   pnpm exec tsx scripts/redisToMongo.ts
 *
 * 接続情報は ルートの .env から読み込む:
 *   REDIS_URL (default: redis://localhost:6379)
 *   MONGO_URL (default: mongodb://localhost:27017)
 *   MONGO_DB  (default: itsuki)
 */
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

const dotenvPath = path.join(__dirname, "../../..", ".env");
if (fs.existsSync(dotenvPath)) {
  console.log("Loading .env file from:", dotenvPath);
  dotenv.config({ path: dotenvPath });
}

import { redis } from "../src/redis/client";
import { buffKey } from "../src/redis/streamsRedis";
import { getMongoDb } from "../src/mongo/client";

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
const importStream = async (name: string): Promise<void> => {
  const raws = await redis.lrange(buffKey(name), 0, -1);
  if (raws.length === 0) {
    console.log(`[redisToMongo] ${name}: redis empty, skip`);
    return;
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
    return;
  }

  await col.insertMany(docs);
  console.log(
    `[redisToMongo] ${name}: inserted ${docs.length} docs, skipped ${skipped} duplicate timestamps`,
  );
};

const main = async (): Promise<void> => {
  try {
    for (const name of ["PLAYBACK", "TIMELAPSE"]) {
      await importStream(name);
    }
    console.log("[redisToMongo] done");
  } catch (e) {
    console.error("[redisToMongo] failed:", e);
    process.exitCode = 1;
  } finally {
    // Redis / Mongo の接続を閉じてプロセスを終了させる。
    redis.disconnect();
    process.exit(process.exitCode ?? 0);
  }
};

void main();
