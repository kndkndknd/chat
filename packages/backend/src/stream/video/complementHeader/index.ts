import { videoBufferState } from "../../../state";

/**
 * WebM/Matroska の代表ID
 */
const EBML_ID = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]); // EBML Header
const CLUSTER_ID = Buffer.from([0x1f, 0x43, 0xb6, 0x75]); // Cluster

type SessionState = {
  header?: Buffer;
  bufferUntilHeader?: Buffer;
  chunkIndex: number;
};

export const sessions = new Map<string, SessionState>();

/**
 * buf 内で最初の Cluster ID のオフセットを探す
 */
export function findFirstClusterOffset(buf: Buffer): number {
  return buf.indexOf(
    videoBufferState.CLUSTER_ID as Uint8Array<ArrayBufferLike>
  );
}

/**
 * buf が EBML Header で始まるか
 */
export function startsWithEbmlHeader(buf: Buffer): boolean {
  if (buf.length < (videoBufferState.EBML_ID as Buffer).length) return false;
  return buf
    .subarray(0, (videoBufferState.EBML_ID as Buffer).length)
    .equals(videoBufferState.EBML_ID as Uint8Array<ArrayBufferLike>);
}

/**
 * 最初のチャンクから「ヘッダ(EBML + SegmentのInfo/Tracksまで)」を抽出する。
 * 具体的には「先頭から最初の Cluster 要素の直前」までをヘッダとみなす。
 * - 返り値 header: 見つかった場合は Buffer、見つからなければ undefined
 * - 返り値 clusters: 先頭の Cluster 以降（実メディア）
 */
export function extractHeaderAndClusters(buf: Buffer): {
  header?: Buffer;
  clusters: Buffer;
} {
  const clusterOffset = findFirstClusterOffset(buf);
  if (clusterOffset <= 0) {
    // Cluster が見つからない、または先頭が Cluster の場合はヘッダ抽出不可
    return { header: undefined, clusters: buf };
  }
  const header = buf.subarray(0, clusterOffset);
  const clusters = buf.subarray(clusterOffset);
  return { header, clusters };
}

/**
 * sid に使えない文字を軽く除去
 */
export function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]/g, "_");
}
