/**
 * redisHalveByRecordIndex.ts
 *
 * docker/docker-compose.yml で定義されている Redis 上の streamBuffer について、
 * 同一 recordIndex を持つデータを「半分」に間引くスクリプト。
 *
 * 選別方法:
 *   recordIndex ごとにグループ化し、timestamp の昇順に並べたとき
 *   偶数番目(2番目, 4番目, ... = 1始まりの偶数位置)のエントリを削除する。
 *   例) 同一 recordIndex に 6 件あれば、timestamp 昇順で 1,2,3,4,5,6 とし
 *       2,4,6 番目を削除して 1,3,5 番目(3 件)を残す。
 *
 * recordIndex を持たないエントリ(例: TIMELAPSE)は、ストリーム全体を 1 つの
 * グループとみなして同様に timestamp 昇順の偶数番目を削除する。
 *
 * 実行:
 *   cd packages/backend
 *   pnpm exec tsx scripts/redisHalveByRecordIndex.ts            # 実際に削除
 *   pnpm exec tsx scripts/redisHalveByRecordIndex.ts --dry-run  # 集計のみ(削除しない)
 *   pnpm exec tsx scripts/redisHalveByRecordIndex.ts PLAYBACK   # 対象を絞る(PLAYBACK / TIMELAPSE のみ可)
 *
 * 接続情報は ルートの .env から読み込む:
 *   REDIS_URL (default: redis://localhost:6379)
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

// recordIndex を持たないエントリをまとめるためのグループキー。
const NO_RECORD_INDEX = "__none__";

type Parsed = {
  raw: string; // Redis に格納されている生の JSON 文字列(無加工で書き戻す)
  origIndex: number; // リスト上の元の位置(安定ソート用のタイブレーク)
  recordIndex: number | null;
  timestamp: number;
};

// streamBuffer(name) について recordIndex グループごとに timestamp 昇順の偶数番目を削除する。
const halveStream = async (name: string, dryRun: boolean): Promise<void> => {
  const raws = await redis.lrange(buffKey(name), 0, -1);
  if (raws.length === 0) {
    console.log(`[halve] ${name}: redis empty, skip`);
    return;
  }

  const entries: Parsed[] = raws.map((raw, origIndex) => {
    const obj = JSON.parse(raw);
    const ri =
      obj.recordIndex === undefined || obj.recordIndex === null
        ? null
        : obj.recordIndex;
    return { raw, origIndex, recordIndex: ri, timestamp: obj.timestamp ?? 0 };
  });

  // recordIndex ごとにグループ化する。
  // recordIndex を持たないエントリは NO_RECORD_INDEX の 1 グループにまとめる。
  const groups = new Map<number | string, Parsed[]>();
  for (const e of entries) {
    const key = e.recordIndex === null ? NO_RECORD_INDEX : e.recordIndex;
    const arr = groups.get(key);
    if (arr) arr.push(e);
    else groups.set(key, [e]);
  }

  // 各グループを timestamp 昇順(同値は元の順序)で並べ、偶数番目(1始まり)を削除対象にする。
  const deleteSet = new Set<number>();
  for (const [key, arr] of groups) {
    arr.sort((a, b) =>
      a.timestamp !== b.timestamp
        ? a.timestamp - b.timestamp
        : a.origIndex - b.origIndex,
    );
    let removed = 0;
    arr.forEach((e, i) => {
      // i は 0 始まり。1始まりの偶数番目 = 0始まりの奇数 index。
      if (i % 2 === 1) {
        deleteSet.add(e.origIndex);
        removed++;
      }
    });
    const label = key === NO_RECORD_INDEX ? "(no recordIndex)" : `recordIndex=${key}`;
    console.log(
      `[halve] ${name}: ${label} ${arr.length} -> ${arr.length - removed} (removed ${removed})`,
    );
  }

  if (deleteSet.size === 0) {
    console.log(`[halve] ${name}: nothing to delete`);
    return;
  }

  const kept = entries
    .filter((e) => !deleteSet.has(e.origIndex))
    .map((e) => e.raw);

  console.log(
    `[halve] ${name}: total ${entries.length} -> ${kept.length} (delete ${deleteSet.size})`,
  );

  if (dryRun) {
    console.log(`[halve] ${name}: --dry-run のため Redis は変更しません`);
    return;
  }

  // リストを作り直す: 元のキーを消し、残すエントリを元の順序で rpush し直す。
  const key = buffKey(name);
  const tx = redis.multi();
  tx.del(key);
  const CHUNK = 1000;
  for (let i = 0; i < kept.length; i += CHUNK) {
    tx.rpush(key, ...kept.slice(i, i + CHUNK));
  }
  await tx.exec();
  console.log(`[halve] ${name}: redis updated (${kept.length} entries remain)`);
};

// 対象ストリームは PLAYBACK と TIMELAPSE のみに限定する。
const ALLOWED = ["PLAYBACK", "TIMELAPSE"] as const;

const main = async (): Promise<void> => {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const names = argv.filter((a) => !a.startsWith("--"));

  const invalid = names.filter((n) => !ALLOWED.includes(n as (typeof ALLOWED)[number]));
  if (invalid.length > 0) {
    console.error(
      `[halve] 対象は ${ALLOWED.join(" / ")} のみです。無効な指定: ${invalid.join(", ")}`,
    );
    process.exit(1);
  }

  const targets = names.length > 0 ? names : [...ALLOWED];

  try {
    for (const name of targets) {
      await halveStream(name, dryRun);
    }
    console.log("[halve] done");
  } catch (e) {
    console.error("[halve] failed:", e);
    process.exitCode = 1;
  } finally {
    redis.disconnect();
    process.exit(process.exitCode ?? 0);
  }
};

void main();
