import { redis } from "./client";
import { buffStateType } from "../../../../types";

const KEYS_SET = "streams:keys";

function audioKey(name: string) {
  return `streams:${name}:audio`;
}
function videoKey(name: string) {
  return `streams:${name}:video`;
}
function indexKey(name: string) {
  return `streams:${name}:index`;
}
function bufferSizeKey(name: string) {
  return `streams:${name}:bufferSize`;
}

function toBase64(audio: ArrayBuffer | Float32Array): string {
  if (audio instanceof Float32Array) {
    return Buffer.from(audio.buffer, audio.byteOffset, audio.byteLength).toString("base64");
  }
  return Buffer.from(audio).toString("base64");
}

function fromBase64(b64: string): ArrayBuffer {
  const buf = Buffer.from(b64, "base64");
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

export const streamsRedis = {
  async hasKey(name: string): Promise<boolean> {
    return (await redis.sismember(KEYS_SET, name)) === 1;
  },

  async getAllKeys(): Promise<string[]> {
    return redis.smembers(KEYS_SET);
  },

  async initKey(name: string, bufferSize: number): Promise<void> {
    await redis.sadd(KEYS_SET, name);
    if ((await redis.exists(bufferSizeKey(name))) === 0) {
      await redis.set(bufferSizeKey(name), bufferSize);
    }
    if ((await redis.exists(indexKey(name))) === 0) {
      await redis.set(indexKey(name), 0);
    }
  },

  // Audio
  async pushAudio(name: string, audio: ArrayBuffer | Float32Array): Promise<void> {
    await redis.rpush(audioKey(name), toBase64(audio));
  },

  async pushAudioBatch(name: string, audios: (ArrayBuffer | Float32Array)[]): Promise<void> {
    if (audios.length === 0) return;
    await redis.rpush(audioKey(name), ...audios.map(toBase64));
  },

  async getAudio(name: string, index: number): Promise<ArrayBuffer | null> {
    const raw = await redis.lindex(audioKey(name), index);
    return raw !== null ? fromBase64(raw) : null;
  },

  async getAudioLength(name: string): Promise<number> {
    return redis.llen(audioKey(name));
  },

  async shiftAudio(name: string): Promise<ArrayBuffer | null> {
    const raw = await redis.lpop(audioKey(name));
    return raw !== null ? fromBase64(raw) : null;
  },

  async clearAudio(name: string): Promise<void> {
    await redis.del(audioKey(name));
  },

  async getRandomAudio(name: string): Promise<ArrayBuffer | null> {
    const len = await redis.llen(audioKey(name));
    if (len === 0) return null;
    return this.getAudio(name, Math.floor(Math.random() * len));
  },

  // Video
  async pushVideo(name: string, video: string): Promise<void> {
    await redis.rpush(videoKey(name), video);
  },

  async pushVideoBatch(name: string, videos: string[]): Promise<void> {
    if (videos.length === 0) return;
    await redis.rpush(videoKey(name), ...videos);
  },

  async getVideo(name: string, index: number): Promise<string | null> {
    return redis.lindex(videoKey(name), index);
  },

  async getVideoLength(name: string): Promise<number> {
    return redis.llen(videoKey(name));
  },

  async shiftVideo(name: string): Promise<string | null> {
    return redis.lpop(videoKey(name));
  },

  async clearVideo(name: string): Promise<void> {
    await redis.del(videoKey(name));
  },

  async getRandomVideo(name: string): Promise<string | null> {
    const len = await redis.llen(videoKey(name));
    if (len === 0) return null;
    return this.getVideo(name, Math.floor(Math.random() * len));
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

  // BufferSize
  async getBufferSize(name: string): Promise<number> {
    const val = await redis.get(bufferSizeKey(name));
    return val !== null ? parseInt(val, 10) : 8192;
  },

  async setBufferSize(name: string, val: number): Promise<void> {
    await redis.set(bufferSizeKey(name), val);
  },

  // Initialization
  async initDefaultKeys(defaultBufferSize: number): Promise<void> {
    const defaultKeys = ["PLAYBACK", "TIMELAPSE", "INTERNET", "EMPTY"];
    for (const key of defaultKeys) {
      await this.initKey(key, defaultBufferSize);
    }
  },
};

// Chats (buffStateType queue)
export const chatsRedis = {
  async push(buffer: buffStateType): Promise<void> {
    const audioB64 = Buffer.from(buffer.audio).toString("base64");
    const entry = JSON.stringify({
      source: buffer.source,
      video: buffer.video,
      audio: audioB64,
      bufferSize: buffer.bufferSize,
      duration: buffer.duration,
      from: buffer.from,
      floating: buffer.floating,
      filter: buffer.filter,
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

function deserializeChat(raw: string): buffStateType {
  const obj = JSON.parse(raw);
  const buf = Buffer.from(obj.audio, "base64");
  return {
    source: obj.source,
    video: obj.video,
    audio: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    bufferSize: obj.bufferSize,
    duration: obj.duration,
    from: obj.from,
    floating: obj.floating,
    filter: obj.filter,
  };
}
