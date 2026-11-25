import { sampleRateState } from "../state";

// 対数一様分布で min〜max の周波数を選ぶ。
// 線形一様だと低い周波数に偏るため、桁（オクターブ）ごとに均等になるようにする。
export const logUniformRandomRate = (min: number, max: number): number => {
  if (min <= 0 || max <= min) {
    return min;
  }
  return min * Math.pow(max / min, Math.random());
};

// 線形一様分布（完全ランダム）で min〜max の周波数を選ぶ。
export const uniformRandomRate = (min: number, max: number): number => {
  if (max <= min) {
    return min;
  }
  return min + Math.random() * (max - min);
};

export const randomRateForStream = (stream: string): number => {
  const max = sampleRateState.randomraterange[stream].max;
  const min = sampleRateState.randomraterange[stream].min;
  // "random" は従来どおり対数一様分布、"uniform" は完全ランダム。
  if (sampleRateState.randomratemode === "uniform") {
    return uniformRandomRate(min, max);
  } else if (sampleRateState.randomratemode === "diatonic") {
    const baseFreq = 5512.5;
    const minMultiple = Math.ceil(min / baseFreq);
    const maxMultiple = Math.floor(max / baseFreq);
    if (minMultiple > maxMultiple) {
      throw new Error("minFreq > maxFreq");
    }

    const randomMultiple =
      Math.floor(Math.random() * (maxMultiple - minMultiple + 1)) + minMultiple;
    return baseFreq * randomMultiple;
    // return 5512.5 + Math.floor(Math.random() * 20) * 5512.5;
  } else if (sampleRateState.randomratemode === "serial") {
    const baseFrequency = 5512.5; // 基準となる倍数
    let noteNumber = 1; // 音階の数

    // 下限に最も近い基音（Ⅰ）を計算
    const baseNote = Math.ceil(min / baseFrequency) * baseFrequency;

    // 平均律の12音間隔（1オクターブは12等分される）
    const semitoneRatio = Math.pow(2, 1 / 12);

    const frequencies: number[] = [];
    let currentFrequency = baseNote;

    // 上限に達するまで周波数を計算して配列に追加
    while (currentFrequency <= max) {
      frequencies.push(currentFrequency);
      if (noteNumber !== 3 && noteNumber !== 7) {
        // イオニアンスケールの3度と7度は半音上げる
        currentFrequency = currentFrequency * semitoneRatio * semitoneRatio;
      } else {
        currentFrequency = currentFrequency * semitoneRatio;
      }
      noteNumber++;
      if (noteNumber > 7) {
        noteNumber = 1;
      }
    }
    console.log("sampleRateRandomize: ", frequencies);
    return frequencies[Math.floor(Math.random() * frequencies.length)];
  }
  return logUniformRandomRate(min, max);
};

export const sampleRateRandomize = (stream: string) => {
  const freq = randomRateForStream(stream);
  console.log("sampleRateRandomize: ", freq);
  return freq;
};
