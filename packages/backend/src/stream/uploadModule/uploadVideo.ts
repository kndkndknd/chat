import * as fs from "fs";
import { spawn } from "child_process";

import { streamState } from "../../state";
import { streamsRedis } from "../../data";
import { buffStateType } from "../../../../../types";

import { promiseGetPcmData } from "./getPcmData";
import { promiseGetImageData } from "./getImageData";
import { pushStateStream } from "../pushStateStream";

export const uploadVideo = async (f: string, durationArr, mediaDirPath) => {
  const fSplit = f.split(".");
  const fName = fSplit[0];

  try {
    await pushStateStream(fName);

    await durationArr.forEach(async (duration) => {
      const getPcmOption = {
        stereo: true,
        sampleRate: 22050,
        ss: duration.ss,
        t: duration.t,
      };
      const getPcmResult = <ArrayBuffer[]>await promiseGetPcmData(
        `${mediaDirPath}/${f}`,
        8192,
        getPcmOption,
      );
      console.log("getPcmResult", getPcmResult.length);
      const getImageResult = <string[]>(
        await promiseGetImageData(f, mediaDirPath, getPcmOption)
      );
      // console.log("getImageResult", getImageResult.length);

      await streamsRedis.clear(fName);
      const maxLen = Math.max(getPcmResult.length, getImageResult.length);
      const buffArr: buffStateType[] = [];
      for (let i = 0; i < maxLen; i++) {
        if(!getPcmResult[i] || !getImageResult[i]) {
          console.warn(`Warning: Missing data at index ${i} for file ${fName}. Skipping this chunk.`);
          continue;
        }
        buffArr.push({
          source: fName,
          audio: (getPcmResult[i] as ArrayBuffer) ?? new ArrayBuffer(0),
          video: getImageResult[i] ?? "",
          bufferSize: 8192,
          duration: 8192 / 44100,
        });
      }
      await streamsRedis.pushBatch(fName, buffArr);
    });
    return await true;
  } catch (err) {
    console.log("1st catch");
    console.error(err);
    return await false;
  }
};
