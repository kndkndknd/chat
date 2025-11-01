import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import fs from "fs";
import path from "path";
import process from "process";
import { fileURLToPath } from "url";

type Nullable<T> = T | null;

export class FFmpegIngestManager {
  private ffmpeg: Nullable<ChildProcessWithoutNullStreams> = null;
  private starting = false;

  constructor(
    private readonly options: { outputDir: string; playlistName: string }
  ) {}

  private ensureOutputDir() {
    fs.mkdirSync(this.options.outputDir, { recursive: true });
  }

  private cleanArtifacts() {
    const entries = fs.readdirSync(this.options.outputDir, {
      withFileTypes: true,
    });
    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }
      if (entry.name.endsWith(".m3u8") || entry.name.endsWith(".ts")) {
        fs.rmSync(path.join(this.options.outputDir, entry.name));
      }
    }
  }

  private spawnProcess() {
    const segmentPattern = path.join(this.options.outputDir, "segment_%03d.ts");
    const playlistPath = path.join(
      this.options.outputDir,
      this.options.playlistName
    );

    const args = [
      "-loglevel",
      "error",
      "-f",
      "webm",
      "-i",
      "pipe:0",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-tune",
      "zerolatency",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-ar",
      "44100",
      "-ac",
      "2",
      "-f",
      "hls",
      "-hls_time",
      process.env.HLS_SEGMENT_SECONDS ?? "2",
      "-hls_list_size",
      process.env.HLS_PLAYLIST_SIZE ?? "6",
      "-hls_flags",
      "delete_segments+append_list",
      "-hls_segment_filename",
      segmentPattern,
      playlistPath,
    ];

    const ffmpegProcess = spawn("ffmpeg", args, {
      stdio: ["pipe", "inherit", "inherit"],
    });

    ffmpegProcess.on("error", (error) => {
      console.error("[ffmpeg] プロセス起動に失敗しました:", error);
    });

    ffmpegProcess.on("close", (code, signal) => {
      console.log(`[ffmpeg] 終了 code=${code} signal=${signal}`);
      this.ffmpeg = null;
    });

    this.ffmpeg = ffmpegProcess;
  }

  private async ensureProcess() {
    if (this.ffmpeg) {
      return;
    }
    if (this.starting) {
      await new Promise<void>((resolve) => {
        const timer = setInterval(() => {
          if (!this.starting) {
            clearInterval(timer);
            resolve();
          }
        }, 25);
      });
      return;
    }

    this.starting = true;
    try {
      this.ensureOutputDir();
      this.cleanArtifacts();
      this.spawnProcess();
    } finally {
      this.starting = false;
    }
  }

  async feed(chunk: Buffer): Promise<void> {
    if (!chunk || chunk.length === 0) {
      return;
    }

    await this.ensureProcess();
    const current = this.ffmpeg;
    if (!current) {
      throw new Error("ffmpeg プロセスが起動していません。");
    }

    await new Promise<void>((resolve, reject) => {
      const handleError = (error: Error) => {
        current.stdin.off("error", handleError);
        reject(error);
      };

      current.stdin.once("error", handleError);

      const ok = current.stdin.write(chunk, (error) => {
        current.stdin.off("error", handleError);
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });

      if (!ok) {
        current.stdin.once("drain", () => {
          current.stdin.off("error", handleError);
          resolve();
        });
      } else if (current.stdin.writableLength === 0) {
        current.stdin.off("error", handleError);
        resolve();
      }
    });
  }

  stop() {
    const current = this.ffmpeg;
    if (!current) {
      return;
    }

    current.stdin.end();
    current.kill("SIGINT");
    this.ffmpeg = null;
  }
}
