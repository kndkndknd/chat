import { Binary } from "mongodb";
import { streamsRedis } from "../redis/streamsRedis";
import { streamList } from "../data";
import { pushStateStream } from "../stream/pushStateStream";
import { getMongoDb } from "./client";
import { buffStateType } from "../../../../types";

const YESTERDAY = "YESTERDAY";
const DAY_MS = 24 * 60 * 60 * 1000;

const audioToArrayBuffer = (audio: unknown): ArrayBuffer => {
  if (audio instanceof ArrayBuffer) return audio;
  if (Buffer.isBuffer(audio)) {
    return audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength) as ArrayBuffer;
  }
  if (audio instanceof Binary) {
    const buf = audio.buffer;
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  }
  return new ArrayBuffer(0);
};

export const loadYesterdayPlayback = async (): Promise<number> => {
  const now = Date.now();
  const target = now - DAY_MS;

  const yStart = new Date(now);
  yStart.setDate(yStart.getDate() - 1);
  yStart.setHours(0, 0, 0, 0);
  const tStart = new Date(now);
  tStart.setHours(0, 0, 0, 0);

  const db = await getMongoDb();
  const col = db.collection("PLAYBACK");

  const yesterdayDocs = await col
    .find({ timestamp: { $gte: yStart.getTime(), $lt: tStart.getTime() } })
    .toArray();

  if (yesterdayDocs.length === 0) {
    console.log("[loadYesterdayPlayback] no yesterday docs");
    return 0;
  }

  let closest = yesterdayDocs[0];
  let closestDiff = Math.abs((closest.timestamp ?? 0) - target);
  for (const doc of yesterdayDocs) {
    const diff = Math.abs((doc.timestamp ?? 0) - target);
    if (diff < closestDiff) {
      closest = doc;
      closestDiff = diff;
    }
  }

  const recordIndex = closest.recordIndex;
  if (recordIndex === undefined || recordIndex === null) {
    console.log("[loadYesterdayPlayback] closest doc has no recordIndex, skip");
    return 0;
  }

  const matched = yesterdayDocs
    .filter((d) => d.recordIndex === recordIndex)
    .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));

  await streamsRedis.clear(YESTERDAY);
  await streamsRedis.initKey(YESTERDAY);
  if (!streamList.includes(YESTERDAY)) {
    pushStateStream(YESTERDAY);
  }

  const buffs: buffStateType[] = matched.map((d) => ({
    source: YESTERDAY,
    audio: audioToArrayBuffer(d.audio),
    video: d.video ?? "",
    bufferSize: d.bufferSize ?? 0,
    duration: d.duration ?? 0,
    from: d.from,
    floating: d.floating,
    filter: d.filter,
    timestamp: d.timestamp,
    recordIndex: d.recordIndex,
  }));
  await streamsRedis.pushBatch(YESTERDAY, buffs);

  console.log(
    `[loadYesterdayPlayback] recordIndex=${recordIndex}, loaded ${buffs.length} buffers (closestDiff=${closestDiff}ms)`,
  );
  return buffs.length;
};
