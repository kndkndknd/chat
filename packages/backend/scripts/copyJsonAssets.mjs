// src 配下の .json を dist にディレクトリ構造を保ってコピーする。
// tsc は .ts のみを emit するため、JSON アセットは別途コピーが必要。
import { cpSync, readdirSync, statSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, "..", "src");
const distDir = join(here, "..", "dist");

let count = 0;
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full);
    } else if (entry.endsWith(".json")) {
      const rel = full.slice(srcDir.length + 1);
      const dest = join(distDir, rel);
      mkdirSync(dirname(dest), { recursive: true });
      cpSync(full, dest);
      count++;
      console.log(`[copyJsonAssets] ${rel}`);
    }
  }
};

walk(srcDir);
console.log(`[copyJsonAssets] copied ${count} json file(s) to dist`);
