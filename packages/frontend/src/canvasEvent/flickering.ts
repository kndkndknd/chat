import { canvasElement } from "./canvasElement";

export const flickering = (): void => {
  const { cnvs, ctx } = canvasElement;
  const intervalMs = 500;
  const durationMs = 3000;
  let elapsed = 0;
  let isBlack = true;

  const tick = () => {
    ctx.fillStyle = isBlack ? "#000000" : "#ffffff";
    ctx.fillRect(0, 0, cnvs.width, cnvs.height);
    isBlack = !isBlack;
    elapsed += intervalMs;
    if (elapsed < durationMs) {
      setTimeout(tick, intervalMs);
    }
  };

  tick();
};
