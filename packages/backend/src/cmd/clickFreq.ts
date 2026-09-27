import { cmdState } from "../state/states/cmdState";

export const clickFreq = (cmd: "UP" | "DOWN" | "SAME") : number => {
  // console.log("clickFreq", cmd, cmdState.CLICKFREQ);
  const currentFreq = cmdState.CLICKFREQ;
  if (cmd === "SAME") return currentFreq;

  const A4 = 440;

  // A メジャースケールの、A からの半音オフセット
  // A(0) B(2) C#(4) D(5) E(7) F#(9) G#(11)
  const scaleOffsets = [0, 2, 4, 5, 7, 9, 11];

  // A4 から見た半音差（平均律: f = A4 * 2^(n/12)）
  const semitoneFromA4 = 12 * Math.log2(currentFreq / A4);
  const roundedSemitone = Math.round(semitoneFromA4);

  // オクターブ位置と、オクターブ内のピッチクラス(0-11)に分解
  const octave = Math.floor(roundedSemitone / 12);
  const pitchClass = ((roundedSemitone % 12) + 12) % 12;

  // 現在の音がスケール内のどのインデックスかを特定
  let idx = scaleOffsets.indexOf(pitchClass);
  if (idx === -1) {
    // スケール外の周波数が来た場合は最も近いスケール音を採用
    idx = scaleOffsets.reduce((bestIdx, val, i) => {
      const diff = Math.abs(val - pitchClass);
      const bestDiff = Math.abs(scaleOffsets[bestIdx] - pitchClass);
      return diff < bestDiff ? i : bestIdx;
    }, 0);
  }

  // スケール内インデックスを ±1 し、必要ならオクターブを繰り上げ/繰り下げ
  let newIdx = idx + (cmd === "UP" ? 1 : -1);
  let newOctave = octave;

  if (newIdx >= scaleOffsets.length) {
    newIdx = 0;
    newOctave += 1; // G# の次は A（オクターブ+1）
  } else if (newIdx < 0) {
    newIdx = scaleOffsets.length - 1;
    newOctave -= 1; // A の前は G#（オクターブ-1）
  }

  const newSemitone = newOctave * 12 + scaleOffsets[newIdx];
  return A4 * Math.pow(2, newSemitone / 12);
};
