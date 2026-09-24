import Hls from "hls.js";
import { canvasElement } from "../canvasEvent/canvasElement";
import { erasePrint } from "../canvasEvent";

let hls: Hls | null = null;
let video: HTMLVideoElement | null = null;
let rafId = 0;
let onEnded: (() => void) | null = null;

// <video id="cinemaVideo"> の映像を、showImage と同じフィット計算で canvas に描画する。
const drawFrame = () => {
  rafId = requestAnimationFrame(drawFrame);
  const v = video;
  if (!v || v.readyState < 2 || v.videoWidth === 0 || v.videoHeight === 0) {
    return;
  }
  const ctx = canvasElement.ctx;
  const aspect = v.videoWidth / v.videoHeight;
  const windowAspect = window.innerWidth / window.innerHeight;
  const wdth =
    aspect > windowAspect ? window.innerWidth : window.innerHeight * aspect;
  const hght =
    aspect > windowAspect ? window.innerWidth / aspect : window.innerHeight;
  const x = window.innerWidth / 2 - wdth / 2;
  const y = window.innerHeight / 2 - hght / 2;
  erasePrint();
  ctx.drawImage(v, x, y, wdth, hght);
};

export const cinemaPlay = (data: { url: string }) => {
  cinemaStop();
  video = document.getElementById("cinemaVideo") as HTMLVideoElement;
  if (!video) {
    console.error("cinemaVideo element not found");
    return;
  }
  // ワンショット再生（末尾で停止し、先頭には戻らない）
  video.loop = false;
  // 過去の自動再生ブロックで muted が残っていても、再生のたびに音声ありへ戻す
  video.muted = false;

  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = data.url;
  } else if (Hls.isSupported()) {
    hls = new Hls();
    hls.loadSource(data.url);
    hls.attachMedia(video);
  } else {
    console.error("HLS is not supported in this browser");
    return;
  }

  // 再生終了後に画面を消す
  onEnded = () => cinemaStop();
  video.addEventListener("ended", onEnded, { once: true });

  video.play().catch(() => {
    // 音声付き自動再生がブロックされた場合はミュートで再試行する
    if (!video) return;
    video.muted = true;
    video.play().catch((e) => console.error("cinema play error:", e));
  });
  rafId = requestAnimationFrame(drawFrame);
};

export const cinemaStop = () => {
  if (rafId !== 0) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
  if (hls !== null) {
    hls.destroy();
    hls = null;
  }
  if (video !== null) {
    if (onEnded !== null) {
      video.removeEventListener("ended", onEnded);
      onEnded = null;
    }
    video.pause();
    video.removeAttribute("src");
    video.load();
    video = null;
  }
  erasePrint();
};
