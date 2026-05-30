import { readFileSync } from "fs";
import { join } from "path";
import { streamsRedis } from "../redis/streamsRedis";
import { itsukiState } from "../state/states/itsukiState";
import { clientState, currentState } from "../state";
import { execStream } from "../cmd/execStream";
import { stopEmit } from "../cmd/stopEmit";
import { rotateItsuki } from "../rotate/rotateItsuki";
import { bpmChange } from "../parameterChange/bpmChange";
import { gridChange } from "../parameterChange/gridChange";
import { ioState } from "../state/states/ioState";
import { recordEmit } from "../stream/recordEmit";

const ONE_HOUR_MS = 60 * 60 * 1000;

// シナリオ実行終了後、追加で顔認識をブロックする時間（90秒）。
const FACE_DETECT_BLOCK_AFTER_MS = 90 * 1000;

type Candidate = { buffer: string; index: number | null };

type ScenarioAction = {
  type: string;
  source?: string;
  property?: string;
  value?: number;
  valueMin?: number;
  valueMax?: number;
};

type ScenarioStep = {
  delayMs: number;
  actions: ScenarioAction[];
};

type Scenario = {
  steps: ScenarioStep[];
};

const loadScenario = (): Scenario => {
  const raw = readFileSync(join(__dirname, "faceDetectScenario.json"), "utf-8");
  return JSON.parse(raw) as Scenario;
};

type AvailableBuffers = {
  yesterday: boolean;
  recent: boolean;
  recentIndex: number | null;
  today: boolean;
  todayIndex: number | null;
};

const checkAvailableBuffers = async (): Promise<AvailableBuffers> => {
  const result: AvailableBuffers = {
    yesterday: itsukiState.faceDetect.yesterdayLoaded,
    recent: false,
    recentIndex: null,
    today: false,
    todayIndex: null,
  };

  const entries = await streamsRedis.getRecordIndexEntries("PLAYBACK");
  if (entries.length === 0) return result;

  // recent = 最大 recordIndex
  let latestIndex = entries[0].recordIndex;
  for (const e of entries) {
    if (e.recordIndex > latestIndex) latestIndex = e.recordIndex;
  }
  result.recent = true;
  result.recentIndex = latestIndex;

  // today = 本日0時以降 かつ latestIndex 以外 のうち、1時間前に最も近いもの
  const now = Date.now();
  const tStart = new Date(now);
  tStart.setHours(0, 0, 0, 0);
  const target = now - ONE_HOUR_MS;

  const todayEntries = entries.filter(
    (e) => e.recordIndex !== latestIndex && e.timestamp >= tStart.getTime(),
  );
  if (todayEntries.length === 0) return result;

  let closestIndex = todayEntries[0].recordIndex;
  let closestDiff = Math.abs(todayEntries[0].timestamp - target);
  for (const e of todayEntries) {
    const diff = Math.abs(e.timestamp - target);
    if (diff < closestDiff) {
      closestIndex = e.recordIndex;
      closestDiff = diff;
    }
  }

  result.today = true;
  result.todayIndex = closestIndex;
  return result;
};

const pickClientId = (): string | undefined => {
  const ids = Object.keys(clientState.client);
  if (ids.length === 0) return undefined;
  return ids[Math.floor(Math.random() * ids.length)];
};

// fixedId が指定されればその端末で再生する。なければランダムに選ぶ。
const runBuffer = (candidate: Candidate, fixedId?: string) => {
  const id = fixedId ?? pickClientId();
  if (id === undefined) {
    console.log("[faceDetectScenario] no client to play", candidate.buffer);
    return;
  }
  const source = candidate.buffer === "yesterday" ? "YESTERDAY" : "PLAYBACK";
  execStream(source, id, candidate.index ?? undefined);
  console.log("[faceDetectScenario] execStream", source, candidate.index, "->", id);
};

// シナリオ実行中に複数アクションで共有する状態
type ScenarioContext = {
  firstBuffer: Candidate | null;
  rest: Candidate[];
  // 顔認識した端末ID（playFirstBuffer の再生先を固定するために使う）
  detectedClientId?: string;
};

const runAction = (action: ScenarioAction, ctx: ScenarioContext) => {
  switch (action.type) {
    case "playFirstBuffer": {
      // playFirstBuffer は顔認識した端末で再生する
      if (ctx.firstBuffer) runBuffer(ctx.firstBuffer, ctx.detectedClientId);
      break;
    }
    case "playRestBuffers": {
      for (const candidate of ctx.rest) runBuffer(candidate);
      break;
    }
    case "execStream": {
      const id = pickClientId();
      if (id === undefined) {
        console.log("[faceDetectScenario] no client for", action.source);
        break;
      }
      execStream(action.source ?? "", id);
      console.log("[faceDetectScenario] execStream", action.source, "->", id);
      break;
    }
    case "stopEmit": {
      const id = pickClientId();
      stopEmit(id ?? "");
      console.log("[faceDetectScenario] stopEmit ->", id);
      break;
    }
    case "rotateItsuki": {
      rotateItsuki();
      console.log("[faceDetectScenario] rotateItsuki");
      break;
    }
    case "bpmChange": {
      const value =
        action.value ??
        (action.valueMin ?? 0) +
          Math.floor(
            Math.random() *
              ((action.valueMax ?? 0) - (action.valueMin ?? 0) + 1),
          );
      bpmChange({ value });
      console.log("[faceDetectScenario] bpmChange", value);
      break;
    }
    case "gridChange": {
      gridChange({ property: action.property });
      console.log("[faceDetectScenario] gridChange", action.property);
      break;
    }
    default:
      console.log("[faceDetectScenario] unknown action", action.type);
  }
};

export const faceDetectScenario = async (detectedClientId?: string) => {
  // 顔認識した端末を target に録画リクエストを送る。
  // すでに録画中の場合はスキップする。
  if (currentState.RECORD) {
    console.log("[faceDetectScenario] already recording, skip recordEmit");
  } else {
    recordEmit(detectedClientId);
  }

  const availableBuffers = await checkAvailableBuffers();
  console.log("[faceDetectScenario] available buffers", availableBuffers);

  const candidates: Candidate[] = [];
  if (availableBuffers.yesterday) {
    candidates.push({ buffer: "yesterday", index: null });
  }
  if (availableBuffers.recent) {
    candidates.push({ buffer: "recent", index: availableBuffers.recentIndex });
  }
  if (availableBuffers.today) {
    candidates.push({ buffer: "today", index: availableBuffers.todayIndex });
  }

  const ctx: ScenarioContext = {
    firstBuffer: null,
    rest: [],
    detectedClientId,
  };
  if (candidates.length === 0) {
    console.log("[faceDetectScenario] no available buffer");
  } else {
    ctx.firstBuffer =
      candidates[Math.floor(Math.random() * candidates.length)];
    ctx.rest = candidates.filter((c) => c !== ctx.firstBuffer);
    console.log("[faceDetectScenario] firstBuffer", ctx.firstBuffer);
  }

  const scenario = loadScenario();

  // シナリオ実行中〜終了後 FACE_DETECT_BLOCK_AFTER_MS の間は顔認識をブロックする。
  // 実行時間はシナリオ最終ステップの delayMs（最大値）とみなす。
  const scenarioDurationMs = scenario.steps.reduce(
    (max, step) => Math.max(max, step.delayMs),
    0,
  );
  const blockDurationMs = scenarioDurationMs + FACE_DETECT_BLOCK_AFTER_MS;
  ioState.io?.emit("faceDetectBlockFromServer", { durationMs: blockDurationMs });
  console.log("[faceDetectScenario] block face detection for", blockDurationMs, "ms");

  for (const step of scenario.steps) {
    const runStep = () => {
      for (const action of step.actions) runAction(action, ctx);
    };
    if (step.delayMs <= 0) {
      runStep();
    } else {
      setTimeout(runStep, step.delayMs);
    }
  }
};
