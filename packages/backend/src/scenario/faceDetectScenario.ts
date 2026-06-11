import { readFileSync } from "fs";
import { join } from "path";
import { streamsRedis } from "../redis/streamsRedis";
import { itsukiState } from "../state/states/itsukiState";
import { clientState, currentState, streamState } from "../state";
import { execStream } from "../cmd/execStream";
import { stopStream } from "../cmd/splitSpace/stopStream";
import { stopEmit } from "../cmd/stopEmit";
import { rotateItsuki } from "../rotate/rotateItsuki";
import { m5Test, blinkM5Switch, m5Switch } from "../rotate/m5Access";
import { bpmChange } from "../parameterChange/bpmChange";
import { gridChange } from "../parameterChange/gridChange";
import { ioState } from "../state/states/ioState";
import { recordEmit } from "../stream/recordEmit";

const ONE_HOUR_MS = 60 * 60 * 1000;

// シナリオ実行終了後、追加で顔認識をブロックする時間。
const FACE_DETECT_BLOCK_AFTER_MS = 20 * 1000;
const ROTATE_OFF_INTERVAL = 60; // m5Test のポーリング間隔 (秒)

// 顔認識成立の瞬間にフロント側でカメラ映像を1フレームだけ表示する時間。
// faceApi/index.ts の SNAPSHOT_DURATION_MS と揃える。
// このスナップショットが消えたあとに、再生するバッファ種別を textPrint する。
const SNAPSHOT_DISPLAY_MS = 1000;

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

type RecentBuffer = {
  recent: boolean;
  recentIndex: number | null;
};

type TodayYesterdayBuffers = {
  yesterday: boolean;
  today: boolean;
  todayIndex: number | null;
};

type AvailableBuffers = RecentBuffer & TodayYesterdayBuffers;

const checkRecentBuffer = async (): Promise<RecentBuffer> => {
  const result: RecentBuffer = { recent: false, recentIndex: null };

  const entries = await streamsRedis.getRecordIndexEntries("PLAYBACK");
  if (entries.length === 0) return result;

  // recent = 最大 recordIndex
  let latestIndex = entries[0].recordIndex;
  for (const e of entries) {
    if (e.recordIndex > latestIndex) latestIndex = e.recordIndex;
  }
  result.recent = true;
  result.recentIndex = latestIndex;
  return result;
};

const checkTodayYesterdayBuffers = async (recentIndex: number | null): Promise<TodayYesterdayBuffers> => {
  const result: TodayYesterdayBuffers = {
    yesterday: itsukiState.faceDetect.yesterdayLoaded,
    today: false,
    todayIndex: null,
  };

  const entries = await streamsRedis.getRecordIndexEntries("PLAYBACK");
  if (entries.length === 0) return result;

  // today = 本日0時以降 かつ recentIndex 以外 のうち、1時間前に最も近いもの
  const now = Date.now();
  const tStart = new Date(now);
  tStart.setHours(0, 0, 0, 0);
  const target = now - ONE_HOUR_MS;

  const todayEntries = entries.filter(
    (e) => e.recordIndex !== recentIndex && e.timestamp >= tStart.getTime(),
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
  execStream(source, id, candidate.index ?? undefined, fixedId);
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
      // 再生対象のインデックス番号と、いま存在する最大のインデックス番号をログ出力する。
      void (async () => {
        const entries = await streamsRedis.getRecordIndexEntries("PLAYBACK");
        const maxIndex = entries.reduce(
          (max, e) => (e.recordIndex > max ? e.recordIndex : max),
          entries.length > 0 ? entries[0].recordIndex : null,
        );
        console.log(
          "[faceDetectScenario] playFirstBuffer index",
          ctx.firstBuffer?.index ?? null,
          "/ max index",
          maxIndex,
        );
      })();
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

export const availableBuffersState: AvailableBuffers = {
  yesterday: false,
  recent: false,
  recentIndex: null,
  today: false,
  todayIndex: null,
};

export const faceDetectScenario = async (detectedClientId?: string) => {
  // 顔認識時はまず再生中のストリームをすべて停止してから、
  // 録画リクエスト（recordEmit）とシナリオ再生（execStream）を行う。
  stopEmit(pickClientId() ?? "all");

  streamState.target.CHAT = detectedClientId ? [detectedClientId] : streamState.target.CHAT;
  currentState.stream.CHAT = true;
  if(detectedClientId !== undefined && detectedClientId !== null) {
    ioState.io?.to(detectedClientId).emit("chatReqFromServer");
  } else {
    ioState.io?.emit("chatReqFromServer");
  }
  setTimeout(() => {
    streamState.target.CHAT = Object.keys(clientState.client);
  }, 5000);

  // 顔認識した端末を target に録画リクエストを送る。
  // if (currentState.RECORD) {
  //   console.log("[faceDetectScenario] already recording, skip recordEmit");
  // } else {
    recordEmit(detectedClientId, false);
  // }

  void m5Test("rotation").then((rotationState) => {
    void blinkM5Switch("rotation", rotationState, 50, 16);
  });
  setTimeout(async () => {
    const rotationState = await m5Test("rotation");
    if (rotationState) m5Switch("rotation", false);
  }, ROTATE_OFF_INTERVAL * 1000);

  // Step 1: recent のみチェックし、playFirstBuffer を確定する。
  const recentBuffer = await checkRecentBuffer();
  console.log("[faceDetectScenario] recent buffer", recentBuffer);
  availableBuffersState.recent = recentBuffer.recent;
  availableBuffersState.recentIndex = recentBuffer.recentIndex;

  const ctx: ScenarioContext = {
    firstBuffer: recentBuffer.recent
      ? { buffer: "recent", index: recentBuffer.recentIndex }
      : null,
    rest: [],
    detectedClientId,
  };
  if (!ctx.firstBuffer) {
    console.log("[faceDetectScenario] no recent buffer");
  } else {
    console.log("[faceDetectScenario] firstBuffer (recent)", ctx.firstBuffer);
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

  // recent の playFirstBuffer を含むシナリオを先に実行する。
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

  // Step 2: today/yesterday を非同期チェックし ctx.rest を更新する。
  // playRestBuffers（15s 後）より先に完了するため、タイミングの問題は生じない。
  void checkTodayYesterdayBuffers(recentBuffer.recentIndex).then((todayYesterday) => {
    console.log("[faceDetectScenario] today/yesterday buffers", todayYesterday);
    availableBuffersState.yesterday = todayYesterday.yesterday;
    availableBuffersState.today = todayYesterday.today;
    availableBuffersState.todayIndex = todayYesterday.todayIndex;

    const todayYesterdayCandidates: Candidate[] = [];
    if (todayYesterday.yesterday) {
      todayYesterdayCandidates.push({ buffer: "yesterday", index: null });
    }
    if (todayYesterday.today) {
      todayYesterdayCandidates.push({ buffer: "today", index: todayYesterday.todayIndex });
    }
    ctx.rest = todayYesterdayCandidates;
  });

  // 40秒後に再生（PLAYBACK）ストリームを停止する。
  setTimeout(() => {
    stopStream();
    console.log("[faceDetectScenario] stopStream (40s)");
  }, 40000);
};
