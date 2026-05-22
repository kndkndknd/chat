import { gainState, socketState } from "../state";
import { gainStateType } from "../../../../types";

const getVal = (node: GainNode | null, fallback = 1): number =>
  node?.gain.value ?? fallback;

const ITEMS: Array<{ key: keyof gainStateType; label: string; initial: () => number }> = [
  { key: "MASTER",     label: "MASTER",     initial: () => getVal(gainState.masterGain) },
  { key: "SINEWAVE",   label: "SINEWAVE",   initial: () => getVal(gainState.oscGain) },
  { key: "FEEDBACK",   label: "FEEDBACK",   initial: () => getVal(gainState.feedbackGain) },
  { key: "WHITENOISE", label: "WHITENOISE", initial: () => getVal(gainState.whitenoiseGain) },
  { key: "CLICK",      label: "CLICK",      initial: () => getVal(gainState.clickGain) },
  { key: "BASS",       label: "BASS",       initial: () => getVal(gainState.bassGain) },
  { key: "CHAT",       label: "CHAT",       initial: () => getVal(gainState.chatGain) },
  { key: "GLITCH",     label: "GLITCH",     initial: () => getVal(gainState.glitchGain) },
  { key: "SIMULATE",   label: "SIMULATE",   initial: () => gainState.simulateMaxGain },
  { key: "METRONOME",  label: "METRONOME",  initial: () => getVal(gainState.clickGain) },
];

let visible = false;
let container: HTMLDivElement | null = null;
const inputs = new Map<keyof gainStateType, HTMLInputElement>();
const valSpans = new Map<keyof gainStateType, HTMLSpanElement>();

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
    "transform:translate(-50%,-50%)",
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
    input.value = "1";
    input.style.width = "160px";

    const span = document.createElement("span");
    span.textContent = "1.00";
    span.style.width = "36px";

    input.addEventListener("input", () => {
      span.textContent = parseFloat(input.value).toFixed(2);
      emitCurrentValues();
    });

    inputs.set(key, input);
    valSpans.set(key, span);

    row.appendChild(lbl);
    row.appendChild(input);
    row.appendChild(span);
    container!.appendChild(row);
  });

  document.body.appendChild(container);
};

export const toggleGainUI = (): void => {
  if (!container) return;
  visible = !visible;
  if (visible) {
    ITEMS.forEach(({ key, initial }) => {
      const input = inputs.get(key);
      const span = valSpans.get(key);
      if (input) {
        const v = initial();
        input.value = String(v);
        if (span) span.textContent = v.toFixed(2);
      }
    });
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
