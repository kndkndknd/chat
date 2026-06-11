/**
 * mongoToRedis.ts
 *
 * ../../docker/mongo で定義されている MongoDB のコレクションを読み出し、
 * docker/docker-compose.yml で定義されている Redis 上の streamBuffer に取り込むスクリプト。
 * （redisToMongo.ts の逆向き処理）
 *
 *  - データベース : itsuki  (env: MONGO_DB)
 *  - Mongo collection "PLAYBACK"  -> Redis streamBuffer "PLAYBACK"
 *  - Mongo collection "TIMELAPSE" -> Redis streamBuffer "TIMELAPSE"
 *
 * Redis 側に同一の timestamp を持つエントリが既に存在する場合は取り込みをスキップする。
 *
 * 引数:
 *   YYYYmmDD 形式の日付を 1 つ渡すと、その日(ローカルタイムの 0:00〜翌 0:00)の
 *   timestamp を持つドキュメントだけを対象にフィルタする。
 *   省略時はコレクション全件を対象にする。
 *
 * 実行:
 *   cd packages/backend
 *   pnpm exec tsx scripts/mongoToRedis.ts            # 全件
 *   pnpm exec tsx scripts/mongoToRedis.ts 20260606   # 2026-06-06 のデータのみ
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
import { streamsRedis } from "../src/redis/streamsRedis";
import { getMongoDb } from "../src/mongo/client";

// YYYYmmDD 文字列を [当日 0:00, 翌日 0:00) の epoch(ms) 範囲に変換する。
// 範囲外・不正な値は null を返す。timestamp は Date.now() 由来の epoch(ms) を想定。
const parseDateRange = (
  arg: string | undefined,
): { gte: number; lt: number } | null => {
  if (arg === undefined) return null;
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(arg);
  if (!m) {
    throw new Error(`日付は YYYYmmDD 形式で指定してください: "${arg}"`);
  }
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
  // 構築した Date が入力と一致するか検証(例: 20260230 のような不正値を弾く)。
  if (
    start.getFullYear() !== year ||
    start.getMonth() !== month - 1 ||
    start.getDate() !== day
  ) {
    throw new Error(`存在しない日付です: "${arg}"`);
  }
  const end = new Date(year, month - 1, day + 1, 0, 0, 0, 0);
  return { gte: start.getTime(), lt: end.getTime() };
};

// Mongo ドキュメントを Redis に格納する生 JSON 文字列へ変換する。
// serializeStream と同一の形(audio は base64 文字列)で書き出す。
const docToRaw = (doc: Record<string, unknown>): string => {
  const audio = doc.audio;
  let audioB64 = "";
  if (Buffer.isBuffer(audio)) {
    audioB64 = audio.toString("base64");
  } else if (audio && typeof audio === "object" && "buffer" in audio) {
    // mongodb の Binary など Buffer 化できるもの。
    audioB64 = Buffer.from(audio as never).toString("base64");
  }
  return JSON.stringify({
    source: doc.source,
    audio: audioB64,
    video: doc.video,
    bufferSize: doc.bufferSize,
    duration: doc.duration,
    from: doc.from,
    floating: doc.floating,
    filter: doc.filter,
    timestamp: doc.timestamp,
    recordIndex: doc.recordIndex,
  });
};

// collection(name) を streamBuffer(name) に取り込む。
// 同一 timestamp が Redis 側に既に存在する場合はそのエントリをスキップする。
const importCollection = async (
  name: string,
  range: { gte: number; lt: number } | null,
): Promise<void> => {
  const db = await getMongoDb();
  const col = db.collection(name);

  const filter = range
    ? { timestamp: { $gte: range.gte, $lt: range.lt } }
    : {};
  // timestamp 昇順で取り込み、Redis 上も時系列順に並ぶようにする。
  const docs = await col.find(filter).sort({ timestamp: 1 }).toArray();

  if (docs.length === 0) {
    console.log(`[mongoToRedis] ${name}: mongo に対象データなし, skip`);
    return;
  }

  // streamBuffer のキーを KEYS_SET / index に登録(未登録なら作成)。
  await streamsRedis.initKey(name);

  // Redis 側に既に存在する timestamp の集合を取得しておく。
  const existingRaws = await redis.lrange(buffKey(name), 0, -1);
  const seen = new Set<number>();
  for (const raw of existingRaws) {
    try {
      const ts = JSON.parse(raw).timestamp;
      if (ts !== undefined && ts !== null) seen.add(ts);
    } catch {
      // パースできないエントリは無視する。
    }
  }

  const entries: string[] = [];
  let skipped = 0;
  for (const doc of docs) {
    const ts = doc.timestamp;
    // timestamp を持たないものは重複判定できないのでそのまま取り込む。
    if (ts !== undefined && ts !== null) {
      if (seen.has(ts)) {
        skipped++;
        continue;
      }
      // 同一実行内での重複も避ける。
      seen.add(ts);
    }
    entries.push(docToRaw(doc as Record<string, unknown>));
  }

  if (entries.length === 0) {
    console.log(
      `[mongoToRedis] ${name}: 追加なし (timestamp 重複 ${skipped} 件をスキップ)`,
    );
    return;
  }

  // 1000 件ずつ rpush する。
  const key = buffKey(name);
  const CHUNK = 1000;
  for (let i = 0; i < entries.length; i += CHUNK) {
    await redis.rpush(key, ...entries.slice(i, i + CHUNK));
  }

  console.log(
    `[mongoToRedis] ${name}: ${entries.length} 件を追加 (timestamp 重複 ${skipped} 件をスキップ)`,
  );
};

const main = async (): Promise<void> => {
  const arg = process.argv.slice(2).find((a) => !a.startsWith("--"));
  try {
    const range = parseDateRange(arg);
    if (range) {
      console.log(
        `[mongoToRedis] 日付フィルタ: ${arg} (${new Date(range.gte).toISOString()} 〜 ${new Date(range.lt).toISOString()})`,
      );
    }
    for (const name of ["PLAYBACK", "TIMELAPSE"]) {
      await importCollection(name, range);
    }
    console.log("[mongoToRedis] done");
  } catch (e) {
    console.error("[mongoToRedis] failed:", e);
    process.exitCode = 1;
  } finally {
    // Redis / Mongo の接続を閉じてプロセスを終了させる。
    redis.disconnect();
    process.exit(process.exitCode ?? 0);
  }
};

void main();
