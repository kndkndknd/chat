// const pcm = require("pcm");
import { execa } from "execa";
import { awaitGetPcmData } from "./getPcmData";
import { pushStateStream } from "../pushStateStream";

import {
  streams,
  cmdList,
  streamList,
  parameterList,
  states,
  uploadParams,
  basisBufferSize,
} from "../../states";
// import { pushStateStream } from "../pushStateStream.js";

export const uploadAudio = async (f: string, mediaDirPath: string) => {
  let tmpBuff = new Float32Array(basisBufferSize);
  let rtnBuff = [];
  let i = 0;
  const fSplit = f.split(".");
  console.log("debug start");
  const filePath = `${mediaDirPath}/${f}`;
  const option = { stereo: true, sampleRate: 22050 };

  try {
    await pushStateStream(fSplit[0], states);
    // const result = <boolean>await getPcmData(filePath, fSplit[0], option);
    const result = await awaitGetPcmData(filePath, fSplit[0], option);
    if (result) {
      return true;
    } else {
      return false;
    }
    /*
    await pcm.getPcmData(
      mediaDirPath + "/" + f,
      { stereo: true, sampleRate: 22050 },
      function (sample, channel) {
        tmpBuff[i] = sample;
        i++;
        if (i === basisBufferSize) {
          streams[fSplit[0]].audio.push(tmpBuff);
          tmpBuff = new Float32Array(basisBufferSize);
          i = 0;
        }
      },
      function (err, output) {
        if (err) {
          console.log("err");
          throw new Error(err);
        }
        console.log(
          "pcm.getPcmData(" + f + ", { stereo: true, sampleRate: 44100 })"
        );
      }
    );
    */
    // streamList.push(streamName);
  } catch (err) {
    console.error(err);
    return false;
  }
  // if(result)
  // await console.log("debug end");
  // await pushStateStream(fSplit[0], states);
  // return true;
};
