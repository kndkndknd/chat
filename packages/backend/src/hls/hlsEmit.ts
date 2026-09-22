import * as fs from "fs";
import * as path from "path";
import { cinemaEmit } from "../socket/ioEmit";
import { currentState } from "../state";

// HLS (m3u8/ts) の配置ルート。このファイルは src/hls にあるため、
// app.ts (src) より1階層深い。__dirname から5階層上が /Users/knd/chat。
const HLS_ROOT = path.join(__dirname, "../../../../..", "hls");

type CinemaTitle = { title: string; url: string };

// フォルダ内の .m3u8 を1つ探す。無ければ null。
const findPlaylist = (dir: string): string | null => {
  try {
    const file = fs.readdirSync(dir).find((f) => f.endsWith(".m3u8"));
    return file ?? null;
  } catch {
    return null;
  }
};

// HLS_ROOT 直下のサブフォルダのうち、m3u8 を持つものを1つランダムに選ぶ。
const pickupRandomTitle = (): CinemaTitle | null => {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(HLS_ROOT, { withFileTypes: true });
  } catch (e) {
    console.error("hls root not found:", HLS_ROOT, e);
    return null;
  }

  const titles: CinemaTitle[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const playlist = findPlaylist(path.join(HLS_ROOT, entry.name));
    if (playlist) {
      titles.push({ title: entry.name, url: `/hls/${entry.name}/${playlist}` });
    }
  }
  if (titles.length === 0) return null;
  return titles[Math.floor(Math.random() * titles.length)];
};

export const hlsEmit = (
  cmd: { cmd: string; value?: number; flag?: boolean; fade?: number; gain?: number },
  target: string[] = [],
) => {
  if (target.length === 0) return;

  const entry = pickupRandomTitle();
  if (!entry) {
    console.error("no playable HLS title under", HLS_ROOT);
    return;
  }

  currentState.cmd.CINEMA = [...new Set([...currentState.cmd.CINEMA, ...target])];
  target.forEach((id) => {
    console.log(`cinemaEmit ${entry.title} -> ${id}`);
    cinemaEmit({ source: "CINEMA", title: entry.title, url: entry.url }, id);
  });
};
