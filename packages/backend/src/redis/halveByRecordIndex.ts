import { redis } from "./client";
import { buffKey } from "./streamsRedis";

// 対象ストリームは PLAYBACK と TIMELAPSE のみに限定する。
export const HALVE_ALLOWED = ["PLAYBACK", "TIMELAPSE"] as const;

// recordIndex を持たないエントリをまとめるためのグループキー。
const NO_RECORD_INDEX = "__none__";

type Parsed = {
  raw: string; // Redis に格納されている生の JSON 文字列(無加工で書き戻す)
  origIndex: number; // リスト上の元の位置(安定ソート用のタイブレーク)
  recordIndex: number | null;
  timestamp: number;
};

export type HalveGroupResult = {
  recordIndex: number | null; // null は recordIndex を持たないグループ
  before: number;
  after: number;
  removed: number;
};

export type HalveStreamResult = {
  stream: string;
  dryRun: boolean;
  total: number;
  remained: number;
  deleted: number;
  groups: HalveGroupResult[];
};

// streamBuffer(name) について recordIndex グループごとに timestamp 昇順の偶数番目を削除する。
// dryRun=true のときは集計のみ行い Redis は変更しない。
export const halveStreamByRecordIndex = async (
  name: string,
  dryRun: boolean,
): Promise<HalveStreamResult> => {
  const raws = await redis.lrange(buffKey(name), 0, -1);
  if (raws.length === 0) {
    console.log(`[halve] ${name}: redis empty, skip`);
    return { stream: name, dryRun, total: 0, remained: 0, deleted: 0, groups: [] };
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
  const groupResults: HalveGroupResult[] = [];
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
    groupResults.push({
      recordIndex: key === NO_RECORD_INDEX ? null : (key as number),
      before: arr.length,
      after: arr.length - removed,
      removed,
    });
  }

  if (deleteSet.size === 0) {
    console.log(`[halve] ${name}: nothing to delete`);
    return {
      stream: name,
      dryRun,
      total: entries.length,
      remained: entries.length,
      deleted: 0,
      groups: groupResults,
    };
  }

  const kept = entries
    .filter((e) => !deleteSet.has(e.origIndex))
    .map((e) => e.raw);

  console.log(
    `[halve] ${name}: total ${entries.length} -> ${kept.length} (delete ${deleteSet.size})`,
  );

  if (dryRun) {
    console.log(`[halve] ${name}: --dry-run のため Redis は変更しません`);
    return {
      stream: name,
      dryRun,
      total: entries.length,
      remained: kept.length,
      deleted: deleteSet.size,
      groups: groupResults,
    };
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

  return {
    stream: name,
    dryRun,
    total: entries.length,
    remained: kept.length,
    deleted: deleteSet.size,
    groups: groupResults,
  };
};
