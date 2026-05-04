import { promiseGetPcmData } from "./getPcmData";
import { pushStateStream } from "../pushStateStream";
import { streamState } from "../../state";
import { streamsRedis } from "../../data";

export const uploadAudio = async (f: string, mediaDirPath: string) => {
  const fSplit = f.split(".");
  console.log("debug start");
  const filePath = `${mediaDirPath}/${f}`;
  const option = { stereo: true, sampleRate: 22050 };
  console.log("debug start2");
  try {
    await pushStateStream(fSplit[0]);
    const result = <Float32Array[]>(
      await promiseGetPcmData(filePath, 8192, option)
    );
    console.log("result", result.length);
    if (result) {
      await streamsRedis.clearAudio(fSplit[0]);
      await streamsRedis.pushAudioBatch(fSplit[0], result);
      return true;
    } else {
      return false;
    }
  } catch (err) {
    console.error(err);
    return false;
  }
};
