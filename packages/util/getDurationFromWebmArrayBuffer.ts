// WebM(ArrayBuffer) から duration 秒を取り出す
export function getDurationFromArrayBuffer(buf: ArrayBuffer): number | null {
  const view = new DataView(buf);
  const uint8 = new Uint8Array(buf);
  let offset = 0;

  // 可変長整数(VINT)を読む
  function readVint(pos: number): { value: number; length: number } {
    const first = uint8[pos];
    if (first === undefined)
      throw new Error("Unexpected EOF while reading VINT");

    // leading 1 の位置でバイト長が決まる
    let length = 1;
    let mask = 0x80;
    while ((first & mask) === 0) {
      mask >>= 1;
      length++;
    }
    if (length > 8) throw new Error("VINT length too large");

    // 値部
    let value = first & (mask - 1);
    for (let i = 1; i < length; i++) {
      value = (value << 8) + uint8[pos + i];
    }
    return { value, length };
  }

  // ID/Size をセットで読む
  function readElementHeader(pos: number): {
    id: number;
    size: number;
    headerLength: number;
  } {
    // ID は VINT だが、普通 4バイトまでなのでそのまま読む
    const idInfo = readVint(pos);
    const sizeInfo = readVint(pos + idInfo.length);
    return {
      id: idInfo.value,
      size: sizeInfo.value,
      headerLength: idInfo.length + sizeInfo.length,
    };
  }

  // WebM/Matroska の既知ID
  const ID_SEGMENT = 0x18538067;
  const ID_INFO = 0x1549a966;
  const ID_TIMECODESCALE = 0x2ad7b1;
  const ID_DURATION = 0x4489;

  // 1. まず Segment を探す
  let segmentStart = -1;
  let segmentSize = -1;

  while (offset < buf.byteLength) {
    const { id, size, headerLength } = readElementHeader(offset);
    // Segment ヒット
    if (id === ID_SEGMENT) {
      segmentStart = offset + headerLength;
      segmentSize = size;
      break;
    } else {
      // 次の要素へ
      offset += headerLength + size;
    }
  }

  if (segmentStart < 0) {
    // Segment が見つからない
    return null;
  }

  // 2. Segment 内を走査して Info を探す
  let infoStart = -1;
  let infoSize = -1;
  let segOffset = segmentStart;
  const segmentEnd =
    segmentSize === 0xffffffff || segmentSize < 0
      ? buf.byteLength
      : segmentStart + segmentSize;

  while (segOffset < segmentEnd) {
    const { id, size, headerLength } = readElementHeader(segOffset);
    if (id === ID_INFO) {
      infoStart = segOffset + headerLength;
      infoSize = size;
      break;
    } else {
      segOffset += headerLength + size;
    }
  }

  if (infoStart < 0) {
    return null;
  }

  // 3. Info の中から TimecodeScale と Duration を探す
  let timecodeScale = 1_000_000; // default 1ms
  let duration: number | null = null;

  let infoOffset = infoStart;
  const infoEnd = infoStart + infoSize;

  while (infoOffset < infoEnd) {
    const { id, size, headerLength } = readElementHeader(infoOffset);
    const dataStart = infoOffset + headerLength;

    if (id === ID_TIMECODESCALE) {
      // unsigned int
      let val = 0;
      for (let i = 0; i < size; i++) {
        val = (val << 8) + uint8[dataStart + i];
      }
      timecodeScale = val;
    } else if (id === ID_DURATION) {
      // float (一般的には float32 or float64)
      if (size === 4) {
        duration = view.getFloat32(dataStart, false);
      } else if (size === 8) {
        duration = Number(view.getFloat64(dataStart, false));
      } else {
        // 想定外サイズは読み飛ばす
      }
    }

    infoOffset += headerLength + size;

    // 両方そろったら抜けてOK
    if (duration != null && timecodeScale != null) break;
  }

  if (duration == null) return null;

  // duration は timecodeScale 単位なのでミリ秒にする
  // timecodeScale は ns 単位(1_000_000 = 1ms = 1,000,000ns)
  const milliseconds = (duration * timecodeScale) / 1_000_000;
  return milliseconds;
}
