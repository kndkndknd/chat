import fs from "fs";
import path from "path";

/**
 * 出力ディレクトリ
 */
const OUT_DIR = path.resolve("out");
fs.mkdirSync(OUT_DIR, { recursive: true });

/**
 * 単体再生可能な断片をディスク保存（検証しやすいように）
 */
function saveChunk(sid: string, index: number, chunk: Buffer) {
  const file = path.join(
    OUT_DIR,
    `${sanitize(sid)}-${String(index).padStart(6, "0")}.webm`
  );
  fs.writeFileSync(file, chunk);
}

/**
 * sid に使えない文字を軽く除去
 */
export function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]/g, "_");
}
