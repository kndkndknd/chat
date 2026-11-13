export type UploadRange = { ss: string; t: string };

// 長尺動画も一定メモリで処理できるよう、連続した20秒区間に分割する。
export const UPLOAD_CHUNK_SECONDS = 20;

const parseTimeToSeconds = (value?: string): number | undefined => {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (trimmed === "") return undefined;

  const parts = trimmed.split(":");
  if (parts.length === 0 || parts.length > 3) return undefined;
  const nums = parts.map(Number);
  if (nums.some((num) => !Number.isFinite(num))) return undefined;

  if (nums.length === 3) {
    return nums[0] * 3600 + nums[1] * 60 + nums[2];
  }
  if (nums.length === 2) {
    return nums[0] * 60 + nums[1];
  }
  return nums[0];
};

const formatSeconds = (seconds: number): string =>
  String(Math.round(seconds * 1000) / 1000);

/**
 * UPLOAD の抽出区間を返す。
 *
 * - 引数なし / FULL: 0秒から動画末尾までを連続20秒区間で返す
 * - 開始時刻のみ: 開始時刻から末尾まで
 * - 開始時刻 + 長さ: 指定区間を連続20秒区間で返す
 */
export const durationPattern = (
  duration: number,
  stringArr: Array<string>,
): UploadRange[] => {
  if (!Number.isFinite(duration) || duration <= 0) return [];

  let start = 0;
  let end = duration;

  const startArg = stringArr[2];
  if (startArg !== undefined && startArg !== "FULL") {
    const parsedStart = parseTimeToSeconds(startArg);
    if (parsedStart !== undefined) start = parsedStart;
  }
  start = Math.max(0, start);
  if (start >= end) return [];

  const lengthArg = stringArr[3];
  if (lengthArg !== undefined) {
    const parsedLength = parseTimeToSeconds(lengthArg);
    if (parsedLength !== undefined && parsedLength > 0) {
      end = Math.min(end, start + parsedLength);
    }
  }

  const ranges: UploadRange[] = [];
  let cursor = start;
  while (cursor < end) {
    const chunkEnd = Math.min(cursor + UPLOAD_CHUNK_SECONDS, end);
    ranges.push({
      ss: formatSeconds(cursor),
      t: formatSeconds(chunkEnd - cursor),
    });
    cursor = chunkEnd;
  }
  return ranges;
};
