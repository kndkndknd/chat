import { contextState, stereoPannerState } from "./state";

type VoiceData = { text: string; lang: string; volume?: number };

// 10文字以上かつ半角スペースを含まない場合は、すべての文字の間にスペースを挿入する。
// speechSynthesis とサーバー TTS で読み方を揃えるため、両方から使う。
const formatSpeechText = (text: string): string =>
  text.length >= 10 && !text.includes(" ")
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
  if (
    typeof speechSynthesis === "undefined" ||
    typeof SpeechSynthesisUtterance === "undefined"
  ) {
    return;
  }

  const uttr = createUtterance(data);

  // 指定言語に一致する voice を優先し、なければ en-US にフォールバックする。
  const applyVoice = () => {
    const voices = speechSynthesis.getVoices();
    const langPrefix = data.lang.split("-")[0];
    const matched =
      voices.find((v) => v.lang === data.lang) ??
      voices.find((v) => v.lang.startsWith(langPrefix)) ??
      voices.find((v) => v.lang === "en-US");
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

// left/right パスでは、サーバー (macOS say) で生成した WAV を Web Audio の
// masterPanner 経由で再生する。speechSynthesis の出力は Web Audio のグラフ外
// なのでパンを適用できないための代替経路。
const playPannedVoice = async (data: VoiceData): Promise<boolean> => {
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
  if (await playPannedVoice(data)) return;
  try {
    speakWithSpeechSynthesis(data);
  } catch (error) {
    console.warn("speechSynthesis failed", error);
  }
};
