import { canvasElement } from "../canvasEvent/canvasElement";
import { contextState, gainState } from "../state";

/**
 * サーバから受信した録画 Blob を再生する。
 * <video> 要素はデコード用のオフスクリーン要素として使うだけで、
 * 表示は canvasElement.cnvs / ctx へのフレーム描画（showImage 相当）、
 * 音声出力は createMediaElementSource で contextState.audioContext（chatGain 経由）へ
 * 接続することで賄う。
 */
export function playRecording(data: {
  container: string;
  mimeType: string;
  blob: ArrayBuffer;
}): void {
  const blob = new Blob([data.blob], { type: data.mimeType });
  const url = URL.createObjectURL(blob);

  const video = document.createElement("video");
  video.src = url;
  video.muted = true; // 音声は WebAudio 経由で出すため、要素自体には出力させない

  const source = contextState.audioContext!.createMediaElementSource(video);
  source.connect(gainState.chatGain!);

  let rafId: number | null = null;
  const ctx = canvasElement.ctx;

  const drawFrame = () => {
    const aspect = video.videoWidth / video.videoHeight;
    const targetAspect = window.innerWidth / window.innerHeight;
    const width = aspect > targetAspect ? window.innerWidth : window.innerHeight * aspect;
    const height = aspect > targetAspect ? window.innerWidth / aspect : window.innerHeight;
    const x = window.innerWidth / 2 - width / 2;
    const y = window.innerHeight / 2 - height / 2;
    ctx.drawImage(video, x, y, width, height);
    rafId = requestAnimationFrame(drawFrame);
  };

  const cleanup = () => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    source.disconnect();
    URL.revokeObjectURL(url);
  };

  video.addEventListener("loadedmetadata", () => {
    rafId = requestAnimationFrame(drawFrame);
  });
  video.addEventListener("ended", cleanup);
  video.addEventListener("error", cleanup);
  void video.play().catch((e) => console.warn("[playRecording] play blocked:", e));
}
