import { getMongoDb } from "../mongo/client";
import { itsukiState } from "../state/states/itsukiState";

const ONE_HOUR_MS = 60 * 60 * 1000;

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

  const db = await getMongoDb();
  const col = db.collection("PLAYBACK");

  const latestDocs = await col
    .find({ recordIndex: { $exists: true } })
    .sort({ recordIndex: -1 })
    .limit(1)
    .toArray();
  if (latestDocs.length === 0) return result;

  const latestIndex = latestDocs[0].recordIndex as number;
  result.recent = true;
  result.recentIndex = latestIndex;

  const now = Date.now();
  const tStart = new Date(now);
  tStart.setHours(0, 0, 0, 0);
  const target = now - ONE_HOUR_MS;

  const todayDocs = await col
    .find({
      recordIndex: { $exists: true, $ne: latestIndex },
      timestamp: { $gte: tStart.getTime() },
    })
    .toArray();
  if (todayDocs.length === 0) return result;

  let closestIndex = todayDocs[0].recordIndex as number;
  let closestDiff = Math.abs((todayDocs[0].timestamp ?? 0) - target);
  for (const doc of todayDocs) {
    const diff = Math.abs((doc.timestamp ?? 0) - target);
    if (diff < closestDiff) {
      closestIndex = doc.recordIndex as number;
      closestDiff = diff;
    }
  }

  result.today = true;
  result.todayIndex = closestIndex;
  return result;
};

export const faceDetectScenario = async () => {
  const availableBuffers = await checkAvailableBuffers();
  console.log("[faceDetectScenario] available buffers", availableBuffers);

  const candidates: { buffer: string; index: number | null }[] = [];
  if (availableBuffers.yesterday) {
    candidates.push({ buffer: "yesterday", index: null });
  }
  if (availableBuffers.recent) {
    candidates.push({ buffer: "recent", index: availableBuffers.recentIndex });
  }
  if (availableBuffers.today) {
    candidates.push({ buffer: "today", index: availableBuffers.todayIndex });
  }

  if (candidates.length === 0) {
    console.log("[faceDetectScenario] no available buffer");
    return;
  }

  const firstBuffer = candidates[Math.floor(Math.random() * candidates.length)];
  console.log("[faceDetectScenario] firstBuffer", firstBuffer);
};
