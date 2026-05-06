import { spawn } from "child_process";
import axios from "axios";
const pcm = require("pcm");

import { streamState } from "../state";
import { streamsRedis, streamApiUrl } from "../data";
import { buffStateType } from "../../../../types";
import { putVideoStream } from "./uploadModule/putVideoStream";
import { pushStateStream } from "./pushStateStream";

export const getLiveStream = async (stream: string, qWord?: string) => {
  try {
    const streamName = stream.includes(" ") ? stream.replace(" ", "") : stream;
    if (!(await streamsRedis.hasKey(stream))) {
      await streamsRedis.initKey(streamName);
      pushStateStream(stream);
    }
    streamState.random[stream] = true;

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

    for (let i = 0; i < streamData.length; i++) {
      const tsFileName = streamData[i].fileName;
      const mediaDirPath = streamData[i].dirPath;
      const audioInfo = streamData[i].audio;

      let videos: string[];
      try {
        videos = await putVideoStream(tsFileName, mediaDirPath, streamName);
      } catch (err) {
        console.log("putStreamResult error ", err);
        continue;
      }

      const audioBuffers: Float32Array[] = [];
      if (audioInfo) {
        let tmpBuff = new Float32Array(streamState.basisBufferSize);
        let buffIndex = 0;

        await pcm.getPcmData(
          mediaDirPath + "/" + tsFileName,
          { stereo: true, sampleRate: 22050 },
          function (sample, channel) {
            tmpBuff[buffIndex] = sample;
            buffIndex++;
            if (buffIndex === streamState.basisBufferSize) {
              audioBuffers.push(tmpBuff);
              tmpBuff = new Float32Array(streamState.basisBufferSize);
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
      }

      const maxLen = Math.max(videos.length, audioBuffers.length);
      const buffArr: buffStateType[] = [];
      for (let j = 0; j < maxLen; j++) {
        buffArr.push({
          source: streamName,
          audio: audioBuffers[j]?.buffer ?? new Float32Array(streamState.basisBufferSize).buffer,
          video: videos[j] ?? "",
          bufferSize: streamState.basisBufferSize,
          duration: streamState.basisBufferSize / 44100,
        });
      }
      await streamsRedis.pushBatch(streamName, buffArr);
    }

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
