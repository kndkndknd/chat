// BLACK コマンド用。全端末の画面を真っ黒にするモード。
// バックエンドの "BLACK" コマンド(receiveEnter)→ blackFromServer 受信で有効化し、
// なにか文字を入力すると解除する(main.ts の keydown 参照)。

let overlay: HTMLDivElement | null = null;
let active = false;

const ensureOverlay = (): HTMLDivElement => {
  if (overlay) return overlay;
  const el = document.createElement("div");
  el.id = "blackOverlay";
  el.style.position = "fixed";
  el.style.top = "0";
  el.style.left = "0";
  el.style.width = "100vw";
  el.style.height = "100vh";
  el.style.backgroundColor = "black";
  // 既存の canvas / video より前面に出して画面全体を覆う。
  el.style.zIndex = "999999";
  el.style.display = "none";
  document.body.appendChild(el);
  overlay = el;
  return el;
};

export const isBlackModeActive = (): boolean => active;

export const enableBlackMode = (): void => {
  const el = ensureOverlay();
  el.style.display = "block";
  active = true;
};

export const disableBlackMode = (): void => {
  if (overlay) {
    overlay.style.display = "none";
  }
  active = false;
};
