/**
 * generateScenario.ts
 *
 * log/ 配下の複数コマンドログ (LogType[] = { date, cmd }[]) を先頭時刻=0 に
 * 相対化して重ね合わせ、一定区間 (bin) ごとに代表コマンドを選んで
 * relative 形式の scenario.json を生成する。
 *
 * 代表コマンドの選び方（詳細は src/scenario/generateScenario.ts）:
 *   1. その区間で最も多くのログに出現したコマンド
 *   2. 同数なら総出現回数が多いコマンド
 *   3. さらに同数なら出現時刻の中央値が早いコマンド
 * 時刻はそのコマンドの出現時刻の中央値（ログ間での中間）を使う。
 *
 * 実行:
 *   cd packages/backend
 *   pnpm exec tsx scripts/generateScenario.ts [--bin 10] [--log-dir <path>] [--out <path>]
 *
 * 既定:
 *   --bin      10 (秒)
 *   --log-dir  <repo>/log
 *   --out      <repo>/scenario/scenario.json
 *
 * 既定では既存の scenario/scenario.json を上書きする。
 * 上書きを避けたい場合は --out で別名を指定する。
 * scenarioItsuki は 25 分周期で scenario.json を読み直すため、
 * 実行中でも次のループから新しい内容が反映される。
 */
import * as fs from "fs";
import * as path from "path";

import { LogType } from "../../../types";
import {
  generateMergedScenario,
  DEFAULT_EXCLUDE_CMDS,
} from "../src/scenario/generateScenario";

const repoRoot = path.join(__dirname, "../../..");

type CliArgs = {
  binSec?: number;
  logDir?: string;
  out?: string;
};

const parseArgs = (argv: string[]): CliArgs => {
  const args: CliArgs = {};
  for (let i = 0; i < argv.length; i++) {
    const current = argv[i];
    if (current === "--bin") {
      args.binSec = Number(argv[++i]);
    } else if (current === "--log-dir") {
      args.logDir = argv[++i];
    } else if (current === "--out") {
      args.out = argv[++i];
    } else {
      console.error(`[generateScenario] unknown option: ${current}`);
      process.exit(1);
    }
  }
  return args;
};

const main = () => {
  const args = parseArgs(process.argv.slice(2));
  const logDir = args.logDir ?? path.join(repoRoot, "log");
  const outPath =
    args.out ?? path.join(repoRoot, "scenario", "scenario.json");

  if (args.binSec !== undefined && (!Number.isFinite(args.binSec) || args.binSec <= 0)) {
    console.error(`[generateScenario] --bin must be a positive number`);
    process.exit(1);
  }
  const binMs = args.binSec !== undefined ? args.binSec * 1000 : undefined;

  if (!fs.existsSync(logDir)) {
    console.error(`[generateScenario] log dir not found: ${logDir}`);
    process.exit(1);
  }
  const files = fs
    .readdirSync(logDir)
    .filter((file) => file.endsWith(".json"))
    .sort();
  if (files.length === 0) {
    console.error(`[generateScenario] no *.json found: ${logDir}`);
    process.exit(1);
  }

  const logs: LogType[][] = files.map((file) => {
    const raw = fs.readFileSync(path.join(logDir, file), "utf-8");
    return JSON.parse(raw) as LogType[];
  });

  const { scenario, stats } = generateMergedScenario(logs, { binMs });

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(scenario, null, 2) + "\n", "utf-8");

  console.log(
    `[generateScenario] logs: ${stats.logCount} files (${files.join(", ")})`,
  );
  console.log(
    `[generateScenario] entries: ${stats.entryCount} (used ${stats.usedEntryCount}, excluded ${stats.excludedEntryCount})`,
  );
  console.log(
    `[generateScenario] excluded cmds: ${DEFAULT_EXCLUDE_CMDS.join(", ")}`,
  );
  console.log(`[generateScenario] steps: ${stats.stepCount}`);
  console.log(`[generateScenario] wrote ${outPath}`);
};

main();
