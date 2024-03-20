// import * as path from "path";
import { spawn } from "child_process";
// import { mkdir } from "fs/promises";
import axios from "axios";
const pcm = require("pcm");

import { streams, basisBufferSize, states, streamApiUrl } from "../states";
import { putVideoStream } from "./uploadModule/putVideoStream";
import { pushStateStream } from "./pushStateStream";

export const getLiveStream = async (stream: string, qWord?: string) => {
  if (!Object.keys(streams).includes(stream)) {
    streams[stream] = {
      video: [],
      audio: [],
      bufferSize: basisBufferSize,
    };
    pushStateStream(stream, states);
  }
  states.stream.random[stream] = true;

  let streamData: { dirPath: string; fileName: string; audio: boolean }[];
  if (qWord !== undefined && qWord !== null) {
    const response = await axios.post("http://127.0.0.1:8088/liveStream", {
      qWord: qWord,
    });
    console.log(response.data);
    streamData = response.data;
  } else {
    if (stream === "LIVESTREAM") {
      const response = await axios.get(streamApiUrl);
      console.log(response.data);
      streamData = response.data;
    } else {
      const response = await axios.post("http://127.0.0.1:8088/liveStream", {
        qWord: stream,
      });
      console.log(response.data);
      streamData = response.data;
    }
  }
  // const streamData = <{ dirPath: string; fileName: string; audio: boolean }[]>(
  //   response.data
  // );

  try {
    for (let i = 0; i < streamData.length; i++) {
      const tsFileName = streamData[i].fileName;
      const mediaDirPath = streamData[i].dirPath;
      const audioInfo = streamData[i].audio;
      const putStreamResult = await putVideoStream(
        tsFileName,
        mediaDirPath,
        stream
      );
      if (putStreamResult !== "success") {
        console.log("putStreamResult error ", putStreamResult);
        continue;
      }

      if (audioInfo) {
        let tmpBuff = new Float32Array(basisBufferSize);
        let buffIndex = 0;

        await pcm.getPcmData(
          mediaDirPath + "/" + tsFileName,
          { stereo: true, sampleRate: 22050 },
          function (sample, channel) {
            tmpBuff[buffIndex] = sample;
            buffIndex++;
            if (buffIndex === basisBufferSize) {
              streams[stream].audio.push(tmpBuff);
              tmpBuff = new Float32Array(basisBufferSize);
              buffIndex = 0;
            }
          },
          function (err, output) {
            if (err) {
              console.log("err");
              throw new Error(err);
            }
            console.log(
              "pcm.getPcmData(" +
                tsFileName +
                ", { stereo: true, sampleRate: 44100 })"
            );
          }
        );
      } else {
        for (let j = 0; j < streams[stream].video.length; j++) {
          const float32Array = new Float32Array(basisBufferSize);
          for (let k = 0; k < basisBufferSize; k++) {
            float32Array[k] = 0;
          }
        }
      }
    }
    /*
    const removeResult = await removeFile(streamData[0].dirPath);
    if (removeResult === "success") {
      console.log("remove files");
    } else {
      console.log("remove files error");
    }
    */

    return await true;
  } catch (err) {
    console.log(err);
    return await false;
  }
};

const removeFile = async (dirPath) => {
  return new Promise((resolve, reject) => {
    const option = ["-rf", `${dirPath}/*`];
    const rm = spawn("rm", option);
    rm.on("error", (err) => {
      reject("error");
    });
    rm.on("close", (code) => {
      if (code !== 0) {
        reject("error");
      }
      console.log("remove files");
      resolve("success");
    });
  });
};
