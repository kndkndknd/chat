export const keyDown = (e) => {
    const character = e.key;
    return isLowercaseAlphabet(character)
        ? {
            char: character.toUpperCase(),
            frequency: alphabetToFrequency(character),
        }
        : null;
};
function isLowercaseAlphabet(char) {
    return /^[a-z]$/.test(char);
}
const alphabetToFrequency = (alphabet) => {
    const key = alphabet.toLowerCase(); // 大文字も小文字に変換
    const baseFrequency = 440; // 基準周波数（A4の周波数
    const semitoneSteps = [0, 2, 4, 5, 7, 9, 11]; // A major scale: A B C# D E F# G#
    if (key.length === 1 && key >= "a" && key <= "z") {
        const index = key.charCodeAt(0) - "a".charCodeAt(0);
        const octaveOffset = Math.floor(index / 7);
        const scaleDegree = index % 7;
        // A4からの半音数 = オクターブ×12 + スケール内の半音差
        const semitoneDistance = octaveOffset * 12 + semitoneSteps[scaleDegree];
        return baseFrequency * Math.pow(2, semitoneDistance / 12);
        // const frequency = 440 * Math.pow(2, (index - 9) / 12); // A4を440Hzとする
        // return frequency;
    }
    else {
        return -1; // 無効な入力の場合
    }
};
