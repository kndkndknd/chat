import { execFile } from "child_process";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const MAX_TEXT_LENGTH = 1000;
const MAX_CACHE_ENTRIES = 50;
const MAX_CACHE_BYTES = 20 * 1024 * 1024;
const SAY_TIMEOUT_MS = 10_000;

// 同じ読み上げ要求を繰り返し受けたときに say を毎回起動しないためのキャッシュ。
const voiceCache = new Map<string, Buffer>();
let voiceCacheBytes = 0;
// 同一テキストの同時リクエストで say が多重起動しないようにする。
const inFlight = new Map<string, Promise<Buffer | null>>();

const pickVoice = (lang: string): string | undefined => {
  const lower = lang.toLowerCase();
  if (lower.startsWith("ja")) return "Kyoko";
  if (lower.startsWith("en")) return "Samantha";
  return undefined;
};

const runSay = (
  textFile: string,
  outFile: string,
  voice?: string,
): Promise<void> =>
  new Promise((resolve, reject) => {
    const args = [
      "-f",
      textFile,
      "-o",
      outFile,
      "--file-format=WAVE",
      "--data-format=LEI16@22050",
    ];
    if (voice) args.unshift("-v", voice);

    execFile("say", args, { timeout: SAY_TIMEOUT_MS }, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });

/**
 * macOS の say で読み上げ用の WAV を生成する。
 * say が使えない環境 (Linux など) や生成に失敗した場合は null を返す。
 */
export const synthesizeVoice = async (
  text: string,
  lang: string,
): Promise<Buffer | null> => {
  if (process.platform !== "darwin") return null;

  const normalizedText = text.trim();
  if (normalizedText === "" || normalizedText.length > MAX_TEXT_LENGTH) {
    return null;
  }

  const normalizedLang = lang || "en-US";
  const key = `${normalizedLang}\u0000${normalizedText}`;

  const cached = voiceCache.get(key);
  if (cached) return cached;

  const running = inFlight.get(key);
  if (running) return running;

  const task = (async (): Promise<Buffer | null> => {
    let workDir: string | null = null;

    try {
      workDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), "chat-voice-"),
      );
      const textFile = path.join(workDir, `${randomUUID()}.txt`);
      const outFile = path.join(workDir, `${randomUUID()}.wav`);

      await fs.promises.writeFile(textFile, normalizedText, "utf8");

      const voice = pickVoice(normalizedLang);
      try {
        await runSay(textFile, outFile, voice);
      } catch (error) {
        // 指定した声が入っていない環境では既定の声で再試行する。
        if (!voice) throw error;
        await runSay(textFile, outFile);
      }

      const data = await fs.promises.readFile(outFile);
      if (data.length === 0) return null;

      const previous = voiceCache.get(key);
      if (previous) voiceCacheBytes -= previous.length;
      voiceCache.set(key, data);
      voiceCacheBytes += data.length;

      while (
        voiceCache.size > MAX_CACHE_ENTRIES ||
        voiceCacheBytes > MAX_CACHE_BYTES
      ) {
        const oldest = voiceCache.keys().next().value;
        if (oldest === undefined) break;
        const oldData = voiceCache.get(oldest);
        if (oldData) voiceCacheBytes -= oldData.length;
        voiceCache.delete(oldest);
      }
      return data;
    } catch (error) {
      console.error(
        "[synthesizeVoice] say failed:",
        error instanceof Error ? error.message : error,
      );
      return null;
    } finally {
      if (workDir !== null) {
        await fs.promises
          .rm(workDir, { recursive: true, force: true })
          .catch(() => undefined);
      }
    }
  })();

  inFlight.set(key, task);
  try {
    return await task;
  } finally {
    inFlight.delete(key);
  }
};
