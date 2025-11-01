import {
  extractHeaderAndClusters,
  sessions,
  startsWithEbmlHeader,
} from "./complementHeader";
import { videoBuffers } from "../../data";

export const bufferReceive = (
  sid: string,
  buf: Buffer,
  checkEbmlHeader: boolean
) => {
  if (!sessions.has(sid)) {
    sessions.set(sid, { chunkIndex: 0, bufferUntilHeader: Buffer.alloc(0) });
  }
  const state = sessions.get(sid)!;

  // もし最初から完全 WebM（EBML 付き）なら、そのまま保存しても単体再生可能
  // ただし最初のチャンクで header を確保しておく
  if (!state.header) {
    // すでに貯めがあれば連結してから解析
    const combined =
      state.bufferUntilHeader && state.bufferUntilHeader.length > 0
        ? Buffer.concat([
            state.bufferUntilHeader as Uint8Array<ArrayBufferLike>,
            buf as Uint8Array<ArrayBufferLike>,
          ])
        : buf;

    const { header, clusters } = extractHeaderAndClusters(combined);

    if (header) {
      state.header = header; // 以後これを前置に使う
      state.bufferUntilHeader = undefined;

      // ① 最初のチャンクも “header + clusters” で単体化して保存
      const firstStandalone = Buffer.concat([
        state.header as Uint8Array<ArrayBufferLike>,
        clusters as Uint8Array<ArrayBufferLike>,
      ]);
      // saveChunk(sid, state.chunkIndex++, firstStandalone);
      videoBuffers.push(firstStandalone);
      return "OK(first header extracted and saved)";
    } else {
      // まだヘッダ抽出できない → 追加でバッファ
      state.bufferUntilHeader = combined;
      // videoBuffers.push(combined);
      return "Accepted(buffering until header is extractable)";
    }
  }

  // ここからは header 既知
  // この受信チャンクがすでに EBML で始まる（=完全 WebM）ならそのまま保存
  if (checkEbmlHeader) {
    // saveChunk(sid, state.chunkIndex++, body);
    videoBuffers.push(buf);
    return "OK(already standalone)";
  }

  // 通常の後続チャンク（Cluster 群のみ）→ header を前置して単体化
  const standalone = Buffer.concat([state.header, buf]);
  // saveChunk(sid, state.chunkIndex++, standalone);
  videoBuffers.push(standalone);
  return "OK(prefixed with header)";
};
