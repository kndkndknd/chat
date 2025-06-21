export const speechVoice = (uttr: SpeechSynthesisUtterance) => {
  console.log("debug speechVoice");
  // const uttr = new SpeechSynthesisUtterance();
  // uttr.lang = lang;
  // uttr.text = text;
  // 英語に対応しているvoiceを設定
  speechSynthesis.onvoiceschanged = () => {
    // const voices = speechSynthesis.getVoices().filter((element) => {
    //   return element.lang === data.lang;
    // });
    // uttr.voice = voices[0];
    // console.log("uttr", uttr);
    // speechSynthesis.speak(uttr);
    const voices = speechSynthesis.getVoices();

    for (let i = 0; i < voices.length; i++) {
      // console.log(voices[i]);
      // if (voices[i].lang === "en-US") {
      if (voices[i].lang === uttr.lang) {
        // console.log("hit");
        console.log("voice: ", voices[i]);
        uttr.voice = voices[i];
        // break;
      }
    }
    console.log("uttr", uttr);
    speechSynthesis.speak(uttr);
  };
};
