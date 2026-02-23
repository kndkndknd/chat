import * as fs from "fs";
import { spawn } from "child_process";
import { resolve } from "path";

export const promiseGetImageData = (f: string, filePath: string, options) => {
  return new Promise((resolve, reject) => {
    const fileName = f.split(".")[0];
    const ffmpegPath = "ffmpeg";
    const ffmpegOption = [
      "-i",
      `${filePath}/${f}`,
      "-r",
      "5.4",
      "-f",
      "image2",
      `${filePath}/tmp/${fileName}%06d.jpg`,
    ];
    if (typeof options.ss !== "undefined") {
      ffmpegOption.push("-ss");
      ffmpegOption.push(options.ss);
    }
    if (typeof options.t !== "undefined") {
      ffmpegOption.push("-t");
      ffmpegOption.push(options.t);
    }

    const proc = spawn("ffmpeg", ffmpegOption);
    proc.stdout.on("end", async (buff) => {
      try {
        const files = await fs.readdirSync(filePath + "/tmp");
        const base64Arr: string[] = [];
        console.log(files);
        let jpgs = <Array<string>>[];
        files.forEach((file) => {
          if (file.includes(fileName) && file.includes(".jpg")) {
            jpgs.push(file);
          }
        });
        jpgs.forEach((element) => {
          const img = fs.readFileSync(filePath + "/tmp/" + element);
          const base64str = new Buffer(img).toString("base64");
          // console.log(base64str)
          base64Arr.push("data:image/jpeg;base64," + String(base64str));
        });
        resolve(base64Arr);
      } catch (e) {
        console.error(e);
        reject(["error", String(e)]);
      }
    });

    proc.stdout.on("error", (err) => {
      console.error(err);
      reject(["error", String(err)]);
    });
  });
};
