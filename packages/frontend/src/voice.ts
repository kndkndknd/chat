import { contextState, flagState, stereoPannerState } from "./state";
import { onMuteChange } from "./state/muteState";

type VoiceData = { text: string; lang: string; volume?: number };

// speechSynthesis.getVoices() は初回空のことがあるため、早めに読み込んでおく。
if (
  typeof speechSynthesis !== "undefined" &&
  typeof speechSynthesis.getVoices === "function"
) {
  speechSynthesis.getVoices();
}

// speechSynthesis の出力は Web Audio の muteGain を通らないため、MUTE 時は
// 明示的に発話を停止する。
onMuteChange((flag) => {
  if (
    flag &&
    typeof speechSynthesis !== "undefined" &&
    typeof speechSynthesis.cancel === "function"
  ) {
    speechSynthesis.cancel();
  }
});

// 標準的な女性の英語音声。ブラウザ / OS ごとに名前が異なるため、
// 優先度の高い順に並べ、最初に見つかったものを使用する。
const preferredEnglishVoices = [
  "Samantha", // macOS / iOS (en-US)
  "Google US English", // Chrome (en-US)
  "Microsoft Aria Online (Natural) - English (United States)",
  "Microsoft Jenny Online (Natural) - English (United States)",
  "Microsoft Zira", // Windows (en-US)
  "Serena", // macOS (en-GB)
  "Kate", // macOS (en-GB)
  "Google UK English Female", // Chrome (en-GB)
  "Microsoft Hazel", // Windows (en-GB)
  "Karen", // macOS (en-AU)
  "Moira", // macOS (en-IE)
  "Tessa", // macOS (en-ZA)
  "Fiona", // macOS (en-GB, Scottish)
  "Vicki",
  "Victoria",
  "Allison",
  "Ava",
  "Susan",
];

const normalizeLang = (lang: string): string =>
  lang.replace("_", "-").toLowerCase();

const findPreferredVoice = (
  voices: SpeechSynthesisVoice[],
  names: readonly string[]
): SpeechSynthesisVoice | undefined => {
  for (const name of names) {
    const normalizedName = name.toLowerCase();
    const matched = voices.find((voice) =>
      voice.name.toLowerCase().startsWith(normalizedName)
    );
    if (matched) return matched;
  }
  return undefined;
};

// 英語は端末ごとに声の種類が大きく異なるため、標準的な女性音声を優先する。
// 見つからない場合だけ、従来どおり言語が一致する先頭の voice にフォールバックする。
const pickVoice = (
  voices: SpeechSynthesisVoice[],
  lang: string
): SpeechSynthesisVoice | undefined => {
  const normalizedLang = normalizeLang(lang);
  const sameLang = voices.filter(
    (voice) => normalizeLang(voice.lang) === normalizedLang
  );

  if (normalizedLang.startsWith("en")) {
    const preferred = findPreferredVoice(sameLang, preferredEnglishVoices);
    if (preferred) return preferred;

    // en-GB など同一言語に候補がない場合も、英語の女性音声を使う。
    const englishVoices = voices.filter((voice) =>
      normalizeLang(voice.lang).startsWith("en")
    );
    const preferredEnglish = findPreferredVoice(
      englishVoices,
      preferredEnglishVoices
    );
    if (preferredEnglish) return preferredEnglish;
  }

  const langPrefix = normalizedLang.split("-")[0];
  return (
    sameLang[0] ??
    voices.find((voice) =>
      normalizeLang(voice.lang).startsWith(langPrefix)
    ) ??
    voices.find((voice) => normalizeLang(voice.lang) === "en-us")
  );
};

// 20文字以上かつ半角スペースを含まない場合は、すべての文字の間にスペースを挿入する。
// speechSynthesis とサーバー TTS で読み方を揃えるため、両方から使う。
const formatSpeechText = (text: string): string =>
  text.length >= 20 && !text.includes(" ")
    ? text.split("").join(" ")
    : text;

const createUtterance = (data: VoiceData): SpeechSynthesisUtterance => {
  const uttr = new SpeechSynthesisUtterance();
  uttr.lang = data.lang;
  // volume は 0〜1。指定があればそれを使う（未指定時はデフォルトの 1）
  if (data.volume !== undefined) {
    uttr.volume = data.volume;
  }
  uttr.text = formatSpeechText(data.text);
  return uttr;
};

const speakWithSpeechSynthesis = (data: VoiceData): void => {
  // 中央パスの speechSynthesis は Web Audio の muteGain を通らない。
  // MUTE 中は新しい発話を開始しない（再生中の停止は onMuteChange 側で行う）。
  if (flagState.mute) return;
  if (
    typeof speechSynthesis === "undefined" ||
    typeof SpeechSynthesisUtterance === "undefined"
  ) {
    return;
  }

  const uttr = createUtterance(data);

  // 英語は標準的な女性音声を優先し、なければ言語一致の voice にフォールバックする。
  const applyVoice = () => {
    const matched = pickVoice(speechSynthesis.getVoices(), data.lang);
    if (matched) uttr.voice = matched;
  };

  applyVoice();
  speechSynthesis.onvoiceschanged = applyVoice;
  speechSynthesis.speak(uttr);
};

const decodeAudioData = (
  context: AudioContext,
  data: ArrayBuffer
): Promise<AudioBuffer> =>
  new Promise((resolve, reject) => {
    // 古い Safari は callback 形式のみのため、Promise と callback の両方に対応する。
    const result = context.decodeAudioData(data, resolve, reject);
    if (result && typeof result.then === "function") {
      result.then(resolve, reject);
    }
  });

// サーバー TTS が使えない環境 (Linux など) で毎回リクエストしないためのフラグ。
let serverVoiceUnavailable = false;

// サーバー (macOS say) で生成した WAV を Web Audio の masterPanner 経由で再生する。
// speechSynthesis の出力は Web Audio のグラフ外なので、left/right パスでは
// パンを適用できないための代替経路。中央パンは speechSynthesis を使う。
const playServerVoice = async (data: VoiceData): Promise<boolean> => {
  const context = contextState.audioContext;
  const panner = stereoPannerState.masterPanner;
  if (!context || !panner) return false;
  if (typeof fetch !== "function") return false;
  if (serverVoiceUnavailable) return false;
  if (stereoPannerState.masterPannerParam === 0) return false;

  try {
    const params = new URLSearchParams({
      text: formatSpeechText(data.text),
      lang: data.lang,
    });
    const response = await fetch(`/api/voice?${params.toString()}`);
    if (response.status === 404 || response.status === 501) {
      serverVoiceUnavailable = true;
      return false;
    }
    if (!response.ok) return false;

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("audio/")) return false;

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0) return false;

    if (context.state === "suspended") {
      await context.resume();
    }

    const audioBuffer = await decodeAudioData(context, buffer);
    const source = context.createBufferSource();
    source.buffer = audioBuffer;

    const gain = context.createGain();
    gain.gain.value = data.volume !== undefined ? data.volume : 1;
    source.connect(gain);
    gain.connect(panner);
    source.start();
    return true;
  } catch (error) {
    console.warn(
      "panned voice playback failed; falling back to speechSynthesis",
      error
    );
    return false;
  }
};

export const voice = async (data: VoiceData): Promise<void> => {
  // 中央パンは speechSynthesis で発話する。speechSynthesis の出力は Web Audio の
  // グラフ外なので、left/right パスのパン付き再生だけ /api/voice を使う。
  if (await playServerVoice(data)) return;
  try {
    speakWithSpeechSynthesis(data);
  } catch (error) {
    console.warn("speechSynthesis failed", error);
  }
};
