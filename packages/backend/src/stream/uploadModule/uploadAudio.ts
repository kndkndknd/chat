import { promiseGetPcmData } from "./getPcmData";
import { pushStateStream } from "../pushStateStream";
import { streamState } from "../../state";
import { streamsRedis } from "../../data";
import { buffStateType } from "../../../../../types";

export const uploadAudio = async (f: string, mediaDirPath: string) => {
  const fSplit = f.split(".");
  console.log("debug start");
  const filePath = `${mediaDirPath}/${f}`;
  const option = { stereo: true, sampleRate: 22050 };
  console.log("debug start2");
  try {
    await pushStateStream(fSplit[0]);
    const result = await promiseGetPcmData(filePath, 8192, option);
    console.log("result", result.length);
    if (result) {
      await streamsRedis.clear(fSplit[0]);
      const buffArr: buffStateType[] = result.map((audio) => ({
        source: fSplit[0],
        audio,
        video: "",
        bufferSize: 8192,
        duration: 8192 / 44100,
      }));
      await streamsRedis.pushBatch(fSplit[0], buffArr);
      return true;
    } else {
      return false;
    }
  } catch (err) {
    console.error(err);
    return false;
  }
};
