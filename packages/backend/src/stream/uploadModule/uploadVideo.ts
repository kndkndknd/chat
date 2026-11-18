import * as fs from "fs";
import * as path from "path";

import { redis } from "../../redis/client";
import {
  buffKey,
  indexKey,
  serializeStream,
} from "../../redis/streamsRedis";
import { buffStateType } from "../../../../../types";

import { promiseGetPcmData } from "./getPcmData";
import { promiseGetImageData } from "./getImageData";
import { pushStateStream } from "../pushStateStream";
import { UploadRange } from "./durationPattern";

const PCM_BUFFER_SIZE = 8192;
const PCM_SAMPLE_RATE = 22050;

export const uploadVideo = async (
  f: string,
  durationArr: UploadRange[],
  mediaDirPath: string,
) => {
  const fName = f.split(".")[0];
  const filePath = path.join(mediaDirPath, f);
  // 既存ストリームを壊さないよう、一時キーへ積んでから RENAME で置換する。
  const tempKey = `${buffKey(fName)}:upload_tmp`;

  try {
    await pushStateStream(fName);
    await redis.del(tempKey);

    let hasData = false;
    for (const range of durationArr) {
      const tmpDir = await fs.promises.mkdtemp(
        path.join(mediaDirPath, "upload-"),
      );
      const getPcmOption = {
        stereo: true,
        sampleRate: PCM_SAMPLE_RATE,
        ss: range.ss,
        t: range.t,
      };

      try {
        const [pcmResult, imageResult] = await Promise.allSettled([
          promiseGetPcmData(filePath, PCM_BUFFER_SIZE, getPcmOption),
          promiseGetImageData(f, mediaDirPath, getPcmOption, tmpDir),
        ]);
        if (pcmResult.status === "rejected") {
          throw pcmResult.reason;
        }
        if (imageResult.status === "rejected") {
          throw imageResult.reason;
        }
        const getPcmResult = pcmResult.value;
        const getImageResult = imageResult.value;
        console.log("getPcmResult", getPcmResult.length);
        console.log("getImageResult", getImageResult.length);

        const maxLen = Math.max(
          getPcmResult.length,
          getImageResult.length,
        );
        if (maxLen === 0) continue;

        const timestamp = Date.now();
        const entries: string[] = [];
        for (let i = 0; i < maxLen; i++) {
          const buff: buffStateType = {
            source: fName,
            audio:
              getPcmResult[i] ??
              new Float32Array(PCM_BUFFER_SIZE).buffer,
            video: getImageResult[i] ?? "",
            bufferSize: PCM_BUFFER_SIZE,
            duration: PCM_BUFFER_SIZE / 44100,
            timestamp,
          };
          entries.push(serializeStream(buff));
        }
        await redis.rpush(tempKey, ...entries);
        hasData = true;
      } finally {
        await fs.promises
          .rm(tmpDir, { recursive: true, force: true })
          .catch(() => undefined);
      }
    }

    if (!hasData) {
      await redis.del(tempKey);
      return false;
    }

    await redis.rename(tempKey, buffKey(fName));
    await redis.set(indexKey(fName), 0);
    return true;
  } catch (err) {
    await redis.del(tempKey).catch(() => undefined);
    console.log("uploadVideo error", err);
    console.error(err);
    return false;
  }
};
