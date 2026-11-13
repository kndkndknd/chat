import { socketState } from "../state";
import { click } from "../webaudio/sound/click";
import {
  applyGlobalGain,
  applyGlobalGainValue,
  clampGainValue,
  isGlobalGainKey,
  normalizeGainValue,
} from "../webaudio/params/applyGlobalGain";
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
let latestGainState: gainStateType | null = null;
const inputs = new Map<keyof gainStateType, HTMLInputElement>();
const valSpans = new Map<keyof gainStateType, HTMLSpanElement>();

const emitGainValue = (key: keyof gainStateType, value: number): void => {
  const safeValue = clampGainValue(value);
  // 変更したキーだけを送る。バックエンドは部分更新を受け付け、
  // 更新後の完全な cmdState.GAIN を gainFromServer で返す。
  socketState.socket?.emit("gainFromClient", {
    [key]: safeValue,
  } as Partial<gainStateType>);
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
    // 初回の gainFromServer が届くまでは、古いプレースホルダ値で
    // バックエンド状態を上書きしないよう操作を無効にする。
    input.value = "1";
    input.disabled = true;
    input.style.width = "160px";

    const span = document.createElement("span");
    span.textContent = "--";
    span.style.width = "36px";

    input.addEventListener("input", () => {
      const raw = parseFloat(input.value);
      if (!Number.isFinite(raw)) return;
      const value = clampGainValue(raw);
      span.textContent = value.toFixed(2);
      // MASTER / CHAT / GLITCH は全クライアント共通のミックスバス。
      // ローカルでも即時反映し、バックエンドからの再配信で確定する。
      if (isGlobalGainKey(key)) {
        applyGlobalGainValue(key, value);
      }
      emitGainValue(key, value);
    });

    // CLICK は連続ゲインではなく、設定後のゲインで click() を1発実行する。
    // ドラッグ中の連続発火を避けるため、値が確定する change 時に鳴らす。
    if (key === "CLICK") {
      input.addEventListener("change", () => {
        const raw = parseFloat(input.value);
        if (!Number.isFinite(raw)) return;
        click(clampGainValue(raw), 440);
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

  // すでに gainFromServer を受信済みなら、その値で初期化してから再要求する。
  if (latestGainState) {
    const normalized = setGainUI(latestGainState);
    applyGlobalGain(normalized);
  }
  socketState.socket?.emit("gainReqFromClient");
};

export const toggleGainUI = (): void => {
  if (!container) return;
  visible = !visible;
  if (visible) {
    // バックエンドの現在のゲイン値(正本 cmdState.GAIN)を要求する。
    socketState.socket?.emit("gainReqFromClient");
  }
  container.style.display = visible ? "flex" : "none";
};

// Escape など、UI を閉じるためだけに使う。音源のミュートは行わない。
export const hideGainUI = (): void => {
  if (!container) return;
  visible = false;
  container.style.display = "none";
};

export const setGainUI = (
  data: Partial<gainStateType> | null | undefined,
): gainStateType => {
  const source: Partial<gainStateType> =
    typeof data === "object" && data !== null ? data : {};
  const next = {} as gainStateType;
  ITEMS.forEach(({ key }) => {
    // 欠損・非数値・範囲外は直前の値へフォールバックし、0〜2に収める。
    const value = normalizeGainValue(
      source[key],
      latestGainState ? latestGainState[key] : 1,
    );
    next[key] = value;

    const input = inputs.get(key);
    if (input) {
      input.value = String(value);
      input.disabled = false;
      const span = valSpans.get(key);
      if (span) span.textContent = value.toFixed(2);
    }
  });
  latestGainState = next;
  return next;
};
