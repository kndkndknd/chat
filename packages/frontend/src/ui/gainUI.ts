import { gainState, socketState, contextState } from "../state";
import { click } from "../webaudio/sound/click";
import { gainStateType } from "../../../../types";

const ITEMS: Array<{ key: keyof gainStateType; label: string }> = [
  { key: "MASTER",     label: "MASTER" },
  { key: "SINEWAVE",   label: "SINEWAVE" },
  { key: "FEEDBACK",   label: "FEEDBACK" },
  { key: "WHITENOISE", label: "WHITENOISE" },
  { key: "CLICK",      label: "CLICK" },
  { key: "BASS",       label: "BASS" },
  { key: "CHAT",       label: "CHAT" },
  { key: "GLITCH",     label: "GLITCH" },
  { key: "SIMULATE",   label: "SIMULATE" },
  { key: "METRONOME",  label: "METRONOME" },
];

let visible = false;
let container: HTMLDivElement | null = null;
const inputs = new Map<keyof gainStateType, HTMLInputElement>();
const valSpans = new Map<keyof gainStateType, HTMLSpanElement>();

// --- ゲインのローカル audition(プレビュー) ---
// 音源オシレータ等は initAudio で常時起動しており、gain=0 でミュートされている。
// gainUI でスライダーを動かしたとき、変更した要素だけを鳴らし、他の音源は 0 に
// ミュートすることで「変更した要素の音だけ」を確認できるようにする。
// 設定値そのものは emitCurrentValues 経由で cmdState.GAIN に保存される。

// 各要素に対応する「実際に音が出る」GainNode。MASTER は全体スケール、
// SIMULATE はコマンド駆動で直接の音源を持たないため null。
const sourceNode = (key: keyof gainStateType): GainNode | null => {
  switch (key) {
    case "SINEWAVE":   return gainState.oscGain;
    case "FEEDBACK":   return gainState.feedbackGain;
    case "WHITENOISE": return gainState.whitenoiseGain;
    case "CLICK":      return gainState.clickGain;
    case "METRONOME":  return gainState.clickGain;
    case "BASS":       return gainState.bassGain;
    case "CHAT":       return gainState.chatGain;
    case "GLITCH":     return gainState.glitchGain;
    default:           return null; // MASTER / SIMULATE
  }
};

const SOURCE_KEYS: Array<keyof gainStateType> = [
  "SINEWAVE", "FEEDBACK", "WHITENOISE", "CLICK", "BASS", "CHAT", "GLITCH", "METRONOME",
];

const applyGain = (node: GainNode | null, value: number): void => {
  if (!node || !contextState.audioContext) return;
  node.gain.setTargetAtTime(value, contextState.audioContext.currentTime, 0);
};

// 音源系の GainNode をすべて 0 にする(except は除く)。プレビュー音の停止に使う。
const muteAllSources = (except?: GainNode | null): void => {
  const done = new Set<GainNode>();
  SOURCE_KEYS.forEach((k) => {
    const n = sourceNode(k);
    if (n && n !== except && !done.has(n)) {
      applyGain(n, 0);
      done.add(n);
    }
  });
};

// 変更した要素だけを設定値で鳴らし、他の音源はミュートする(ソロ・プレビュー)。
const auditionGain = (key: keyof gainStateType, value: number): void => {
  const target = sourceNode(key);
  muteAllSources(target);
  if (key === "MASTER") {
    applyGain(gainState.masterGain, value);
  } else if (key === "SIMULATE") {
    gainState.simulateMaxGain = value;
  } else if (key !== "CLICK") {
    // CLICK は連続ゲインを保持しない。発音は change 時に click() で1発実行する。
    applyGain(target, value);
  }
};

const emitCurrentValues = (): void => {
  const data = {} as gainStateType;
  ITEMS.forEach(({ key }) => {
    const el = inputs.get(key);
    data[key] = el ? parseFloat(el.value) : 1;
  });
  socketState.socket?.emit("gainFromClient", data);
};

export const initGainUI = (): void => {
  container = document.createElement("div");
  container.id = "gain-ui";
  container.style.cssText = [
    "display:none",
    "flex-direction:column",
    "gap:6px",
    "position:fixed",
    "top:50%",
    "left:50%",
    "transform:translate(-50%,-50%) scale(1.5)",
    "z-index:10",
    "background:rgba(0,0,0,0.82)",
    "color:#fff",
    "padding:16px 20px",
    "font-family:monospace",
    "font-size:13px",
  ].join(";");

  ITEMS.forEach(({ key, label }) => {
    const row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:center;gap:8px";

    const lbl = document.createElement("label");
    lbl.textContent = label;
    lbl.style.cssText = "width:90px;text-align:right";

    const input = document.createElement("input");
    input.type = "range";
    input.min = "0";
    input.max = "2";
    input.step = "0.01";
    // 初期値はあくまで応答(gainFromServer)到着までの一時プレースホルダ。
    // 正本はバックエンドの cmdState.GAIN で、init 末尾の gainReqFromClient で同期する。
    input.value = "1";
    input.style.width = "160px";

    const span = document.createElement("span");
    span.textContent = "1.00";
    span.style.width = "36px";

    input.addEventListener("input", () => {
      const value = parseFloat(input.value);
      span.textContent = value.toFixed(2);
      // 変更した要素だけをローカルでプレビュー再生(他の音源はミュート)。
      auditionGain(key, value);
      // 値をバックエンドへ保存(cmdState.GAIN を更新)。応答は表示更新のみ。
      emitCurrentValues();
    });

    // CLICK は連続ゲインではなく、設定後のゲインで click() を1発実行する。
    // ドラッグ中の連続発火を避けるため、値が確定する change 時に鳴らす。
    if (key === "CLICK") {
      input.addEventListener("change", () => {
        click(parseFloat(input.value));
      });
    }

    inputs.set(key, input);
    valSpans.set(key, span);

    row.appendChild(lbl);
    row.appendChild(input);
    row.appendChild(span);
    container!.appendChild(row);
  });

  document.body.appendChild(container);

  // 構築直後にバックエンドの正本(cmdState.GAIN)を要求し、入力欄を実値に同期する。
  // これにより UI を一度も開いていない状態でも、各要素の初期値がハードコードの 1 では
  // なくバックエンド定義(SINEWAVE 0.2, WHITENOISE 0.5 等)と一致する。
  // 応答(gainFromServer)は setGainUI で入力欄のみ更新し、音量(GainNode)には適用しない。
  socketState.socket?.emit("gainReqFromClient");
};

export const toggleGainUI = (): void => {
  if (!container) return;
  visible = !visible;
  if (visible) {
    // バックエンドの現在のゲイン値(正本 cmdState.GAIN)を要求する。
    // 応答(gainFromServer)は setGainUI で入力欄のみを更新し、実際の音量
    // (GainNode)には適用しない。UI を開いただけでは音は出ない。
    socketState.socket?.emit("gainReqFromClient");
  } else {
    // UI を閉じたらプレビュー音をすべて止める(設定値は cmdState.GAIN に保存済み)。
    muteAllSources();
  }
  container.style.display = visible ? "flex" : "none";
};

export const setGainUI = (data: gainStateType): void => {
  ITEMS.forEach(({ key }) => {
    const input = inputs.get(key);
    if (input) {
      input.value = String(data[key]);
      const span = valSpans.get(key);
      if (span) span.textContent = data[key].toFixed(2);
    }
  });
};
