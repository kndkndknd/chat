import { videoBufferState } from "../../state";

export async function playVideo(buffer: ArrayBuffer, socket): Promise<void> {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength === 0) {
    throw new Error("Invalid Buffer");
  }

  // 再生中はスキップ（本当に“再生中”かだけを見る）
  if (
    !videoBufferState.videoElement.paused &&
    !videoBufferState.videoElement.ended
  ) {
    console.debug("playing now, skip this chunk");
    return;
  }
  if (videoBufferState.playing) {
    console.debug("playing now, skip this chunk");
    return; // 連打防止
  }
  videoBufferState.playing = true;

  // 再生可能な MIME を決定
  const candidates = ["video/webm; codecs=vp8, opus", "video/webm"];
  const mime =
    candidates.find((m) => videoBufferState.videoElement.canPlayType(m)) ??
    "video/webm";

  const blob = new Blob([buffer], { type: mime });
  const url = URL.createObjectURL(blob);
  videoBufferState.currentObjectUrl = url;

  try {
    // src 差し替え → load() → play()
    videoBufferState.videoElement.src = url;
    videoBufferState.videoElement.preload = "auto";
    await videoBufferState.videoElement.load();

    try {
      // const duration = (await videoBufferState.videoElement.duration) * 1000; // ms
      const duration = 5000;
      // console.log("Video duration (ms):", duration);
      const voidFlag = await videoBufferState.videoElement.play(); // 失敗時は例外
      setTimeout(async () => {
        await videoBufferState.videoElement.pause();
        console.log("request next video chunk after duration:", duration);
        await socket.emit("videoRequestFromClient");
        videoBufferState.playing = false;
        await URL.revokeObjectURL(url);
        videoBufferState.currentObjectUrl = null;
        // }, duration ?? 0);
      }, 5000); // とりあえず5秒後に次を要求
    } catch (err) {
      console.warn("video.play() failed:", err);
      videoBufferState.playing = false;
      socket.emit("videoRequestFromClient");
      // } finally {
    }
  } catch (err) {
    videoBufferState.playing = false;
    console.log("error", err);
  }
}
