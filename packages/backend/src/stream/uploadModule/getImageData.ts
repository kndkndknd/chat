import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";

export const promiseGetImageData = (
  f: string,
  mediaDirPath: string,
  options: { ss?: string; t?: string },
  outputDir: string = path.join(mediaDirPath, "tmp"),
): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const fileName = f.split(".")[0];
    fs.mkdirSync(outputDir, { recursive: true });
    const outputPattern = path.join(outputDir, `${fileName}_%06d.jpg`);

    // -ss は入力前、-t は出力前に置く。出力パターンの後ろに置くと無視される。
    const ffmpegOption = [
      ...(typeof options.ss !== "undefined"
        ? ["-ss", String(options.ss)]
        : []),
      "-i",
      path.join(mediaDirPath, f),
      "-r",
      "5.4",
      ...(typeof options.t !== "undefined" ? ["-t", String(options.t)] : []),
      "-f",
      "image2",
      outputPattern,
    ];

    const proc = spawn("ffmpeg", ffmpegOption);
    let stderr = "";
    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("error", (err) => {
      reject(err);
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `ffmpeg exited with code ${code}: ${stderr.slice(-500)}`,
          ),
        );
        return;
      }

      let files: string[] = [];
      try {
        files = fs
          .readdirSync(outputDir)
          .filter((file) => file.endsWith(".jpg"))
          .sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true }),
          );
        const base64Arr = files.map((file) => {
          const img = fs.readFileSync(path.join(outputDir, file));
          return "data:image/jpeg;base64," + img.toString("base64");
        });
        resolve(base64Arr);
      } catch (err) {
        reject(err);
      } finally {
        for (const file of files) {
          try {
            fs.unlinkSync(path.join(outputDir, file));
          } catch {
            // 後続のファイル削除を止めない
          }
        }
      }
    });
  });
};
