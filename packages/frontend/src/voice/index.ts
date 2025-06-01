export const speechVoice = (data: { text: string; lang: string }) => {
  console.log("debug");
  const uttr = new SpeechSynthesisUtterance();
  uttr.lang = data.lang;
  uttr.text = data.text;
  // 英語に対応しているvoiceを設定
  speechSynthesis.onvoiceschanged = () => {
    const voices = speechSynthesis.getVoices();
    for (let i = 0; i < voices.length; i++) {
      console.log(voices[i]);
      if (voices[i].lang === "en-US") {
        // console.log("hit");
        console.log(voices[i]);
        uttr.voice = voices[i];
        // break;
      }
    }
  };
  console.log(uttr);
  speechSynthesis.speak(uttr);
};
