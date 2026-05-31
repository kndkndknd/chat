import { spawn } from "child_process";
import * as fs from "fs";

export const putVideoStream = async (
  fileName,
  dirPath,
  streamName,
  duration?
): Promise<string[]> => {
  const f = fileName.split(".")[0];
  const ffmpegOption = [
    "-i",
    `${dirPath}/${fileName}`,
    "-r",
    "5.4",
    "-f",
    "image2",
    `${dirPath}/${f}%06d.jpg`,
  ];
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
      const files = fs.readdirSync(dirPath);
      const jpgs: string[] = [];
      for (let i = 0; i < files.length; i++) {
        if (files[i].includes(f) && files[i].includes(".jpg")) {
          jpgs.push(files[i]);
        }
      }
      const videos: string[] = [];
      for (let i = 0; i < jpgs.length; i++) {
        const img = fs.readFileSync(`${dirPath}/${jpgs[i]}`);
        const base64str = Buffer.from(img).toString("base64");
        videos.push("data:image/jpeg;base64," + String(base64str));
      }
      resolve(videos);
    });
  });
};
