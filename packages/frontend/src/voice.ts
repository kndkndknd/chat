export const voice = (data: { text: string; lang: string; volume?: number }) => {
  const uttr = new SpeechSynthesisUtterance();
  uttr.lang = data.lang;
  // volume は 0〜1。指定があればそれを使う（未指定時はデフォルトの 1）
  if (data.volume !== undefined) {
    uttr.volume = data.volume;
  }
  // 10文字以上かつ半角スペースを含まない場合は、すべての文字の間にスペースを挿入する
  uttr.text =
    data.text.length >= 10 && !data.text.includes(" ")
      ? data.text.split("").join(" ")
      : data.text;

  speechSynthesis.onvoiceschanged = () => {
    const voices = speechSynthesis.getVoices();
    for (let i = 0; i < voices.length; i++) {
      console.log(voices[i]);
      if (voices[i].lang === "en-US") {
        console.log("hit");
        console.log(voices[i]);
        uttr.voice = voices[i];
      }
    }
  };

  speechSynthesis.speak(uttr);

}
