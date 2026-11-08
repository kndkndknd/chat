import { contextState, gainState } from "../state";

/**
 * サーバから受信した録画 Blob を再生する。
 * <video> 要素はデコード用のオフスクリーン要素として使うだけで、
 * 表示は #videoBufferCnvs（#cnvs の背面）へのフレーム描画、
 * 音声出力は createMediaElementSource で contextState.audioContext（chatGain 経由）へ
 * 接続することで賄う。
 */
export function playRecording(data: {
  container: string;
  mimeType: string;
  blob: ArrayBuffer;
}): void {
  const canvas = document.getElementById(
    "videoBufferCnvs",
  ) as HTMLCanvasElement | null;
  if (!canvas) {
    console.error("[playRecording] videoBufferCnvs element not found");
    return;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.error("[playRecording] 2d context not available");
    return;
  }

  const blob = new Blob([data.blob], { type: data.mimeType });
  const url = URL.createObjectURL(blob);

  const video = document.createElement("video");
  video.src = url;
  video.muted = true; // 音声は WebAudio 経由で出すため、要素自体には出力させない

  const source = contextState.audioContext!.createMediaElementSource(video);
  source.connect(gainState.chatGain!);

  let rafId: number | null = null;
  let finished = false;

  const drawFrame = () => {
    // cleanup 済みなら再スケジュールしない (実行中に cleanup された場合の保険)。
    if (finished) return;
    const aspect = video.videoWidth / video.videoHeight;
    const targetAspect = window.innerWidth / window.innerHeight;
    const width = aspect > targetAspect ? window.innerWidth : window.innerHeight * aspect;
    const height = aspect > targetAspect ? window.innerWidth / aspect : window.innerHeight;
    const x = window.innerWidth / 2 - width / 2;
    const y = window.innerHeight / 2 - height / 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, x, y, width, height);
    rafId = requestAnimationFrame(drawFrame);
  };

  const cleanup = () => {
    if (finished) return;
    finished = true;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    source.disconnect();
    URL.revokeObjectURL(url);
    // 再生が終了 (ended / error) したら #videoBufferCnvs の描画内容を消す。
    // #cnvs 上の文字・画像は消さない。
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const startDraw = () => {
    if (finished || rafId !== null) return;
    rafId = requestAnimationFrame(drawFrame);
  };

  video.addEventListener("loadedmetadata", startDraw);
  video.addEventListener("ended", cleanup);
  video.addEventListener("error", cleanup);
  video.play().catch(() => {
    // 音声付き自動再生がブロックされた場合はミュートで再試行する。
    video.muted = true;
    video.play().catch((e) => {
      console.error("[playRecording] play failed:", e);
      // 再生できないまま RAF / ObjectURL / AudioNode を残さない。
      cleanup();
    });
  });
}
