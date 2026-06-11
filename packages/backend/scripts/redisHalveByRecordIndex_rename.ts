/**
 * redisHalveByRecordIndex_rename.ts
 *
 * redisHalveByRecordIndex.ts の「一時キー + RENAME 版」。
 *
 * オリジナルは残すエントリ kept を 1 つの MULTI トランザクションに積んで
 * exec() していたため、kept の合計サイズが V8 の文字列長上限(約 512MB)を
 * 超えると `RangeError: Invalid string length` で失敗していた。
 *
 * 本ファイルでは MULTI を使わず、一時キー(:tmp)に rpush を CHUNK ごとに
 * 分割して積み上げてから、最後に RENAME で本番キーへ原子的に差し替える。
 * これにより:
 *   - 1 回の書き込みに載る文字列が CHUNK 件分に抑えられ、上限超えを回避できる。
 *   - 差し替え自体は RENAME 1 コマンドで原子的に行われるため、本番キーが
 *     「途中まで書かれた中途半端な状態」で見えることがない。
 *     (rpush 途中で失敗しても、本番キーは元のまま残る。)
 *
 * 選別方法・実行方法はオリジナルと同じ:
 *   cd packages/backend
 *   pnpm exec tsx scripts/redisHalveByRecordIndex_rename.ts            # 実際に削除
 *   pnpm exec tsx scripts/redisHalveByRecordIndex_rename.ts --dry-run  # 集計のみ
 *   pnpm exec tsx scripts/redisHalveByRecordIndex_rename.ts PLAYBACK   # 対象を絞る
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

  // リストを作り直す: 一時キーに残すエントリを元の順序で rpush し直し、
  // 最後に RENAME で本番キーへ原子的に差し替える。
  // rpush を CHUNK ごとに個別 await することで、1 回の書き込みに載る文字列を
  // CHUNK 件分に抑え、V8 の文字列長上限(RangeError: Invalid string length)を回避する。
  const key = buffKey(name);
  const tmp = `${key}:halve_tmp`;

  // 前回の中断などで残っているかもしれない一時キーを掃除しておく。
  await redis.del(tmp);

  const CHUNK = 1000;
  for (let i = 0; i < kept.length; i += CHUNK) {
    await redis.rpush(tmp, ...kept.slice(i, i + CHUNK));
  }

  // 一時キー -> 本番キー へ原子的に差し替え(本番キーは上書きされる)。
  await redis.rename(tmp, key);
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
