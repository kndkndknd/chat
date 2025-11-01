import path from "path";
import process from "process";
import { fileURLToPath } from "url";

import { FFmpegIngestManager } from "./FFmpegIngestManager";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT ?? 4000);
const HLS_OUTPUT_DIR = path.resolve(__dirname, "../public/hls");
const PLAYLIST_NAME = process.env.HLS_PLAYLIST ?? "stream.m3u8";

const ingestManager = new FFmpegIngestManager({
  outputDir: HLS_OUTPUT_DIR,
  playlistName: PLAYLIST_NAME,
});

export async function ingest(chunk: Buffer): Promise<void> {
  await ingestManager.feed(chunk);
}

export function stopIngesting(): void {
  ingestManager.stop();
}
