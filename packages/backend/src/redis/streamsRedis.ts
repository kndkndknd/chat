import { redis } from "./client";
import { buffStateType } from "../../../../types";

const KEYS_SET = "streams:keys";

export function buffKey(name: string) {
  return `streams:${name}:buff`;
}
export function indexKey(name: string) {
  return `streams:${name}:index`;
}
export function recordCursorKey(name: string, recordIndex: number) {
  return `streams:${name}:recordCursor:${recordIndex}`;
}

export function serializeStream(buff: buffStateType): string {
  const audioB64 = Buffer.from(buff.audio).toString("base64");
  return JSON.stringify({
    source: buff.source,
    audio: audioB64,
    video: buff.video,
    bufferSize: buff.bufferSize,
    duration: buff.duration,
    from: buff.from,
    floating: buff.floating,
    filter: buff.filter,
    timestamp: buff.timestamp,
    recordIndex: buff.recordIndex,
  });
}

export function deserializeStream(raw: string): buffStateType {
  const obj = JSON.parse(raw);
  const buf = Buffer.from(obj.audio, "base64");
  return {
    source: obj.source,
    audio: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
    video: obj.video,
    bufferSize: obj.bufferSize,
    duration: obj.duration,
    from: obj.from,
    floating: obj.floating,
    filter: obj.filter,
    timestamp: obj.timestamp,
    recordIndex: obj.recordIndex,
  };
}

export const streamsRedis = {
  async hasKey(name: string): Promise<boolean> {
    return (await redis.sismember(KEYS_SET, name)) === 1;
  },

  async getAllKeys(): Promise<string[]> {
    return redis.smembers(KEYS_SET);
  },

  async initKey(name: string): Promise<void> {
    await redis.sadd(KEYS_SET, name);
    if ((await redis.exists(indexKey(name))) === 0) {
      await redis.set(indexKey(name), 0);
    }
  },

  async push(name: string, buff: buffStateType): Promise<void> {
    const withTs = buff.timestamp !== undefined ? buff : { ...buff, timestamp: Date.now() };
    await redis.rpush(buffKey(name), serializeStream(withTs));
  },

  async pushBatch(name: string, buffs: buffStateType[]): Promise<void> {
    if (buffs.length === 0) return;
    const now = Date.now();
    await redis.rpush(
      buffKey(name),
      ...buffs.map((b) =>
        serializeStream(b.timestamp !== undefined ? b : { ...b, timestamp: now }),
      ),
    );
  },

  async get(name: string, index: number): Promise<buffStateType | null> {
    const raw = await redis.lindex(buffKey(name), index);
    return raw !== null ? deserializeStream(raw) : null;
  },

  async getLength(name: string): Promise<number> {
    return redis.llen(buffKey(name));
  },

  async shift(name: string): Promise<buffStateType | null> {
    const raw = await redis.lpop(buffKey(name));
    return raw !== null ? deserializeStream(raw) : null;
  },

  async clear(name: string): Promise<void> {
    await redis.del(buffKey(name));
  },

  async getRandom(name: string): Promise<buffStateType | null> {
    const len = await redis.llen(buffKey(name));
    if (len === 0) return null;
    return this.get(name, Math.floor(Math.random() * len));
  },

  // Index
  async getIndex(name: string): Promise<number> {
    const val = await redis.get(indexKey(name));
    return val !== null ? parseInt(val, 10) : 0;
  },

  async setIndex(name: string, val: number): Promise<void> {
    await redis.set(indexKey(name), val);
  },

  async incrementIndex(name: string): Promise<number> {
    return redis.incr(indexKey(name));
  },

  async initDefaultKeys(): Promise<void> {
    const defaultKeys = ["PLAYBACK", "TIMELAPSE", "INTERNET", "EMPTY"];
    for (const key of defaultKeys) {
      await this.initKey(key);
    }
  },

  async findClosestByTimestamp(
    name: string,
    timestamp: number,
  ): Promise<{ entry: buffStateType; firstIndex: number } | null> {
    const raws = await redis.lrange(buffKey(name), 0, -1);
    if (raws.length === 0) return null;
    const entries = raws.map(deserializeStream);
    if (entries.every((e) => e.timestamp === undefined)) return null;

    let closestDiff = Infinity;
    let closestTs: number | undefined;
    for (const entry of entries) {
      if (entry.timestamp === undefined) continue;
      const diff = Math.abs(entry.timestamp - timestamp);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestTs = entry.timestamp;
      }
    }

    const firstIndex = entries.findIndex((e) => e.timestamp === closestTs);
    return { entry: entries[firstIndex], firstIndex };
  },

  // recordIndex 単位の送出カーソル（次に送出する positions の序数）
  async getRecordCursor(name: string, recordIndex: number): Promise<number> {
    const val = await redis.get(recordCursorKey(name, recordIndex));
    return val !== null ? parseInt(val, 10) : 0;
  },

  async setRecordCursor(
    name: string,
    recordIndex: number,
    val: number,
  ): Promise<void> {
    await redis.set(recordCursorKey(name, recordIndex), val);
  },

  // recordIndex を持つエントリの {recordIndex, timestamp} 一覧を返す
  async getRecordIndexEntries(
    name: string,
  ): Promise<{ recordIndex: number; timestamp: number }[]> {
    const raws = await redis.lrange(buffKey(name), 0, -1);
    const items: { recordIndex: number; timestamp: number }[] = [];
    for (const raw of raws) {
      const obj = JSON.parse(raw);
      if (obj.recordIndex !== undefined && obj.recordIndex !== null) {
        items.push({ recordIndex: obj.recordIndex, timestamp: obj.timestamp ?? 0 });
      }
    }
    return items;
  },

  // recordIndex に一致するバッファのリスト位置をタイムスタンプ昇順で返す
  async getPositionsByRecordIndex(
    name: string,
    recordIndex: number,
  ): Promise<number[]> {
    const raws = await redis.lrange(buffKey(name), 0, -1);
    if (raws.length === 0) return [];
    const items: { idx: number; timestamp: number }[] = [];
    raws.forEach((raw, idx) => {
      const obj = JSON.parse(raw);
      if (obj.recordIndex === recordIndex) {
        items.push({ idx, timestamp: obj.timestamp ?? 0 });
      }
    });
    items.sort((a, b) => a.timestamp - b.timestamp);
    return items.map((x) => x.idx);
  },
};

// Chats (buffStateType queue)
export const chatsRedis = {
  async push(buffer: buffStateType): Promise<void> {
    const audioB64 = Buffer.from(buffer.audio).toString("base64");
    const now = Date.now();
    const entry = JSON.stringify({
      source: buffer.source,
      video: buffer.video,
      audio: audioB64,
      bufferSize: buffer.bufferSize,
      duration: buffer.duration,
      from: buffer.from,
      floating: buffer.floating,
      filter: buffer.filter,
      timestamp: buffer.timestamp ?? now,
    });
    await redis.rpush("chats", entry);
  },

  async shift(): Promise<buffStateType | null> {
    const raw = await redis.lpop("chats");
    if (!raw) return null;
    return deserializeChat(raw);
  },

  async length(): Promise<number> {
    return redis.llen("chats");
  },

  async get(index: number): Promise<buffStateType | null> {
    const raw = await redis.lindex("chats", index);
    if (!raw) return null;
    return deserializeChat(raw);
  },
};

export const countersRedis = {
  async increment(key: string): Promise<number> {
    return redis.incr(`counters:${key}`);
  },

  async get(key: string): Promise<number> {
    const val = await redis.get(`counters:${key}`);
    return val !== null ? parseInt(val, 10) : 0;
  },
};

export function deserializeChat(raw: string): buffStateType {
  const obj = JSON.parse(raw);
  const buf = Buffer.from(obj.audio, "base64");
  return {
    source: obj.source,
    video: obj.video,
    audio: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
    bufferSize: obj.bufferSize,
    duration: obj.duration,
    from: obj.from,
    floating: obj.floating,
    filter: obj.filter,
    timestamp: obj.timestamp,
  };
}
