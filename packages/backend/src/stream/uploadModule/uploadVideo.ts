import * as fs from "fs";
import { spawn } from "child_process";

import { streamState } from "../../state";
import { streamsRedis } from "../../data";

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
      console.log("getImageResult", getImageResult.length);

      await streamsRedis.clearAudio(fName);
      await streamsRedis.clearVideo(fName);
      await streamsRedis.pushAudioBatch(fName, getPcmResult);
      await streamsRedis.pushVideoBatch(fName, getImageResult);
    });
    return await true;
  } catch (err) {
    console.log("1st catch");
    console.error(err);
    return await false;
  }
};
