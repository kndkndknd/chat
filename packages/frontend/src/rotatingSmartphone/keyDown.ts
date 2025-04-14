export const keyDown = (
  e: KeyboardEvent
): { char: string; frequency: number } | null => {
  const character = e.key;
  return isLowercaseAlphabet(character)
    ? {
        char: character.toUpperCase(),
        frequency: alphabetToFrequency(character),
      }
    : null;
};

function isLowercaseAlphabet(char: string): boolean {
  return /^[a-z]$/.test(char);
}

const alphabetToFrequency = (alphabet: string): number => {
  const key = alphabet.toLowerCase(); // 大文字も小文字に変換
  if (key.length === 1 && key >= "a" && key <= "z") {
    const index = key.charCodeAt(0) - "a".charCodeAt(0);
    const frequency = 440 * Math.pow(2, (index - 9) / 12); // A4を440Hzとする
    return frequency;
  } else {
    return -1; // 無効な入力の場合
  }
};
