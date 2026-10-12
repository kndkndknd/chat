import { LogType } from "../../../../types";

// 重ね合わせの区間幅（既定 10 秒）。
export const DEFAULT_BIN_MS = 10 * 1000;

// 生成シナリオに含めると副作用が大きいコマンド（先頭トークンで判定）。
//  - START / SCENARIO: シナリオ自身の再起動（無限ループ）
//  - REPLAY: absolute 形式専用
//  - LOG: ログの保存・読込など操作系
export const DEFAULT_EXCLUDE_CMDS = ["START", "SCENARIO", "REPLAY", "LOG"];

export type GenerateScenarioOptions = {
  binMs?: number;
  excludeCmds?: string[];
};

export type GeneratedScenario = {
  format: "relative";
  timetable: { [key: string]: string };
};

export type GenerateScenarioStats = {
  logCount: number;
  entryCount: number;
  usedEntryCount: number;
  excludedEntryCount: number;
  stepCount: number;
};

// 相対 ms を execScenario (relative) が解釈できる H:MM:SS[.mmm] 形式に変換する。
// ミリ秒は getMilliseconds() と同じ整数表記（"5" = 5ms, "250" = 250ms）。
export const formatRelativeTime = (ms: number): string => {
  const safe = Math.max(0, Math.round(ms));
  const h = Math.floor(safe / 3600000);
  const m = Math.floor((safe % 3600000) / 60000);
  const s = Math.floor((safe % 60000) / 1000);
  const msRem = safe % 1000;
  const base = `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return msRem === 0 ? base : `${base}.${msRem}`;
};

// 先頭トークンが除外リストに含まれるか。"LOG PUT" のような引数付きも除外できる。
const isExcluded = (cmd: string, excludeCmds: string[]): boolean => {
  const token = cmd.trim().split(/\s+/)[0];
  return excludeCmds.includes(token);
};

type CmdStat = {
  cmd: string;
  logCount: number;
  total: number;
  median: number;
};

// 代表コマンドの優先順: 出現ログ数 → 総出現回数 → 中央値が早い → 辞書順。
// ログ数優先により「複数ログに共通する操作」が中間的な代表として選ばれる。
const isBetter = (a: CmdStat, b: CmdStat): boolean => {
  if (a.logCount !== b.logCount) return a.logCount > b.logCount;
  if (a.total !== b.total) return a.total > b.total;
  if (a.median !== b.median) return a.median < b.median;
  return a.cmd < b.cmd;
};

// 昇順ソート済み配列の中央値。偶数個は中央 2 値の平均を取る。
const medianOfSorted = (sorted: number[]): number => {
  const n = sorted.length;
  if (n === 0) return 0;
  return n % 2 === 1
    ? sorted[(n - 1) / 2]
    : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
};

// 複数ログを先頭時刻=0 に相対化して重ね合わせ、区間 (bin) ごとに
// 代表コマンドを 1 つ選んで relative 形式の timetable を生成する。
export const generateMergedScenario = (
  logs: LogType[][],
  options: GenerateScenarioOptions = {},
): { scenario: GeneratedScenario; stats: GenerateScenarioStats } => {
  const binMs =
    options.binMs !== undefined && options.binMs > 0
      ? options.binMs
      : DEFAULT_BIN_MS;
  const excludeCmds = options.excludeCmds ?? DEFAULT_EXCLUDE_CMDS;

  let entryCount = 0;
  let excludedEntryCount = 0;
  let usedEntryCount = 0;

  // bin -> cmd -> { logIds, times }
  const bins = new Map<
    number,
    Map<string, { logIds: Set<number>; times: number[] }>
  >();

  logs.forEach((log, logIndex) => {
    if (log.length === 0) {
      return;
    }
    const baseTime = new Date(log[0].date).getTime();
    for (const entry of log) {
      entryCount++;
      if (isExcluded(entry.cmd, excludeCmds)) {
        excludedEntryCount++;
        continue;
      }
      const entryTime = new Date(entry.date).getTime();
      if (!Number.isFinite(entryTime) || !Number.isFinite(baseTime)) {
        excludedEntryCount++;
        continue;
      }
      const relMs = entryTime - baseTime;
      usedEntryCount++;
      const bin = Math.floor(relMs / binMs);
      if (!bins.has(bin)) {
        bins.set(bin, new Map());
      }
      const byCmd = bins.get(bin);
      if (!byCmd.has(entry.cmd)) {
        byCmd.set(entry.cmd, { logIds: new Set(), times: [] });
      }
      const stat = byCmd.get(entry.cmd);
      stat.logIds.add(logIndex);
      stat.times.push(relMs);
    }
  });

  const timetable: { [key: string]: string } = {};
  const sortedBins = [...bins.keys()].sort((a, b) => a - b);
  for (const bin of sortedBins) {
    const byCmd = bins.get(bin);
    let best: CmdStat | null = null;
    for (const [cmd, stat] of byCmd) {
      const sortedTimes = [...stat.times].sort((a, b) => a - b);
      const candidate: CmdStat = {
        cmd,
        logCount: stat.logIds.size,
        total: stat.times.length,
        median: medianOfSorted(sortedTimes),
      };
      if (best === null || isBetter(candidate, best)) {
        best = candidate;
      }
    }
    if (best === null) {
      continue;
    }
    timetable[formatRelativeTime(best.median)] = best.cmd;
  }

  return {
    scenario: { format: "relative", timetable },
    stats: {
      logCount: logs.length,
      entryCount,
      usedEntryCount,
      excludedEntryCount,
      stepCount: Object.keys(timetable).length,
    },
  };
};
