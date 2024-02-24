import { spawn } from "child_process";
import * as fs from "fs";

import { streams, states, basisBufferSize } from "../../states";

export const putVideoStream = async (
  fileName,
  dirPath,
  streamName,
  duration?
) => {
  const f = fileName.split(".")[0];
  // await pushStateStream(streamName, states);
  const ffmpegOption = [
    "-i",
    `${dirPath}/${fileName}`,
    "-r",
    "5.4",
    "-f",
    "image2",
    `${dirPath}/${f}%06d.jpg`,
  ];
  // const ffmpegOption =
  //   duration !== undefined && duration !== null
  //     ? [
  //         "-i",
  //         `${dirPath}/${fileName}`,
  //         "-r",
  //         "5.4",
  //         "-f",
  //         "image2",
  //         `${dirPath}/${f}%06d.jpg`,
  //       ]
  //     : [
  //         "-i",
  //         `${dirPath}/${fileName}`,
  //         "-ss",
  //         duration.ss,
  //         "-t",
  //         duration.t,
  //         "-r",
  //         "5.4",
  //         "-f",
  //         "image2",
  //         `${dirPath}/${f}%06d.jpg`,
  //       ];
  return new Promise((resolve, reject) => {
    const ffmpegChildProcess = spawn("ffmpeg", ffmpegOption);
    ffmpegChildProcess.on("error", (err) => {
      reject(String(err));
    });

    ffmpegChildProcess.on("close", async (code) => {
      if (code !== 0) {
        reject(new Error(`コマンドがエラーコード ${code} で終了しました。`));
        return;
      }
      const files = await fs.readdirSync(dirPath);
      // console.log(files);
      let jpgs = <Array<string>>[];
      for (let i = 0; i < files.length; i++) {
        if (files[i].includes(f) && files[i].includes(".jpg")) {
          jpgs.push(files[i]);
        }
      }
      for (let i = 0; i < jpgs.length; i++) {
        const img = await fs.readFileSync(`${dirPath}/${jpgs[i]}`);
        // const base64str = await new Buffer(img).toString("base64");
        const base64str = await Buffer.from(img).toString("base64");
        // console.log(String(base64str));
        streams[streamName].video.push(
          "data:image/jpeg;base64," + String(base64str)
        );
      }
      console.log(streamName, streams[streamName].video.length);
      resolve("success");
    });
  });
};
