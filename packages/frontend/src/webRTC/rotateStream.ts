// 送信映像を回転させるユーティリティ。
//
// 実機はカメラを 270 度回転して設置しているため、chat_sync へ送る映像はあらかじめ
// 回転させておく必要がある。WebRTC はカメラの track をそのまま送るので、CSS では
// 送出映像を回せない。そこで camera の video track を一旦オフスクリーン <video> に流し、
// canvas へ回転描画したものを canvas.captureStream() で新しい video track として取り出す。
// audio track は元ストリームのものをそのまま流用する。
//
// 注意: <video> を DOM に挿入しない (display:none も含む) と Chrome はデコードを停止し、
// videoWidth が 0 のままになって canvas が描画されない (= chat_sync に黒/空フレームが
// 送られる)。そのため video は画面外に配置しつつ DOM に残してデコードを継続させる。

export interface RotatedStream {
  // chat_sync へ送るための回転済みストリーム (回転 video + 元 audio)。
  stream: MediaStream;
  // 描画ループ停止 + canvas track 停止。再接続をまたいで使い回すので通常は stop() 時のみ。
  stop: () => void;
}

// requestVideoFrameCallback を持つ <video> を型安全に扱うためのヘルパ型。
type VideoFrameVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: () => void) => number;
};

// 送信前に上下左右それぞれ15%をクロップする。
const SEND_CROP = 0.15;

// source の video track を degrees 度回転させた MediaStream を返す。
// degrees が 90 / 270 の場合は縦横が入れ替わる。
export function createRotatedSendStream(
  source: MediaStream,
  degrees: number,
): RotatedStream {
  const videoTrack = source.getVideoTracks()[0];
  // 回転不要 (0 度) または映像が無ければ元ストリームをそのまま使う。
  if (!videoTrack || degrees % 360 === 0) {
    return { stream: source, stop: () => {} };
  }

  const settings = videoTrack.getSettings();
  const fps = settings.frameRate ?? 20;
  const swap = degrees % 180 !== 0; // 90 / 270 度は縦横が入れ替わる

  const canvas = document.createElement("canvas");
  const initW = Math.round((settings.width ?? 640) * (1 - 2 * SEND_CROP));
  const initH = Math.round((settings.height ?? 360) * (1 - 2 * SEND_CROP));
  canvas.width = swap ? initH : initW;
  canvas.height = swap ? initW : initH;
  const ctx = canvas.getContext("2d");

  // canvas へ描くためのオフスクリーン <video>。画面には見せないが、DOM から外したり
  // display:none にすると Chrome がデコードを止めるため、画面外へ追い出して残す。
  const video = document.createElement("video") as VideoFrameVideo;
  video.muted = true;
  video.playsInline = true;
  video.setAttribute("aria-hidden", "true");
  video.style.position = "fixed";
  video.style.left = "-10000px";
  video.style.top = "0";
  video.style.width = "1px";
  video.style.height = "1px";
  video.style.opacity = "0";
  video.style.pointerEvents = "none";
  video.srcObject = new MediaStream([videoTrack]);
  document.body.appendChild(video);

  // 自動再生がブロックされた場合に備え、メタデータ確定時に再試行する (キオスク前提)。
  const tryPlay = (): void => {
    void video.play().catch(() => {
      /* 一時的な失敗は次の loadedmetadata / canplay で再試行される */
    });
  };
  video.addEventListener("loadedmetadata", tryPlay);
  video.addEventListener("canplay", tryPlay);
  tryPlay();

  const rad = (degrees * Math.PI) / 180;

  const draw = (): void => {
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (ctx && w > 0 && h > 0) {
      // 上下左右 SEND_CROP (15%) をクロップしたソース領域。
      const cropX = Math.round(w * SEND_CROP);
      const cropY = Math.round(h * SEND_CROP);
      const cropW = w - 2 * cropX;
      const cropH = h - 2 * cropY;
      // 解像度が確定/変化したら canvas をクロップ後の寸法に合わせる。
      const cw = swap ? cropH : cropW;
      const ch = swap ? cropW : cropH;
      if (canvas.width !== cw) canvas.width = cw;
      if (canvas.height !== ch) canvas.height = ch;
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rad);
      ctx.drawImage(video, cropX, cropY, cropW, cropH, -cropW / 2, -cropH / 2, cropW, cropH);
      ctx.restore();
    }
  };

  // 描画ドライバ: デコードフレームに同期する requestVideoFrameCallback を優先し、
  // 非対応環境ではソース fps の setInterval にフォールバックする。背景タブで
  // スロットルされる requestAnimationFrame は使わない (キオスクは常時前面)。
  let stopped = false;
  let timer: number | null = null;
  if (typeof video.requestVideoFrameCallback === "function") {
    const onFrame = (): void => {
      if (stopped) return;
      draw();
      video.requestVideoFrameCallback?.(onFrame);
    };
    video.requestVideoFrameCallback(onFrame);
  } else {
    timer = window.setInterval(draw, Math.round(1000 / fps));
  }

  const canvasStream = canvas.captureStream(fps);
  const stream = new MediaStream();
  for (const t of canvasStream.getVideoTracks()) stream.addTrack(t);
  for (const t of source.getAudioTracks()) stream.addTrack(t);

  const stop = (): void => {
    stopped = true;
    if (timer !== null) window.clearInterval(timer);
    for (const t of canvasStream.getVideoTracks()) t.stop();
    video.removeEventListener("loadedmetadata", tryPlay);
    video.removeEventListener("canplay", tryPlay);
    video.srcObject = null;
    video.remove();
  };

  return { stream, stop };
}
