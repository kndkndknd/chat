import { videoBufferState } from "../state/";

/** WebM( VP8/Opus ) の ArrayBuffer を #videoBuffer に安全に再生 */
export async function playVideo(buffer: ArrayBuffer): Promise<void> {
  // const video = document.getElementById(
  //   "videoBuffer"
  // ) as HTMLVideoElement | null;

  // if (video.played) {
  //   console.log("Video is already playing, skipping new buffer.");
  //   return; // 再生中は無視
  // }

  if (!videoBufferState.videoElement)
    throw new Error("video element #videoBuffer not found");

  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength === 0) {
    throw new Error("Invalid ArrayBuffer (empty or wrong type)");
  }
  console.log(
    "videoElement currentTime:",
    videoBufferState.videoElement.currentTime
  );
  console.log("videoElement paused:", videoBufferState.videoElement.paused);
  console.log("videoElement ended:", videoBufferState.videoElement.ended);
  console.log(
    "videoElement readyState:",
    videoBufferState.videoElement.readyState
  );

  if (
    videoBufferState.videoElement.currentTime > 0 &&
    !videoBufferState.videoElement.paused &&
    !videoBufferState.videoElement.ended &&
    videoBufferState.videoElement.readyState > 2
  ) {
    console.log("Video is currently playing, skipping new buffer.");
    return; // 再生中は無視
  } else if (
    videoBufferState.videoElement.ended ||
    videoBufferState.videoElement.paused
  ) {
    console.log("Video is not playing, continuing to play new buffer.");
    // cleanup();
    console.log("clean up");
    URL.revokeObjectURL(videoBufferState.currentObjectUrl);
    // videoBufferState.currentObjectUrl = await null;
    // }

    const mimeCandidates = ["video/webm;codecs=vp8,opus", "video/webm"];
    const mime =
      mimeCandidates.find(
        (m) => videoBufferState.videoElement.canPlayType(m) !== ""
      ) ?? "video/webm";

    // 旧URLを解放
    // if (currentObjectUrl) {
    //   await URL.revokeObjectURL(currentObjectUrl);
    //   currentObjectUrl = null;
    // }

    console.log("手前のcurrentObjectUrl", videoBufferState.currentObjectUrl);

    const blob = await new Blob([buffer], { type: mime });
    // const url = await URL.createObjectURL(blob);
    // videoBufferState.currentObjectUrl = url;
    videoBufferState.currentObjectUrl = await URL.createObjectURL(blob);
    console.log("新しいcurrentObjectUrl", videoBufferState.currentObjectUrl);
    // video.addEventListener("ended", cleanup, { once: true });
    // video.addEventListener("emptied", cleanup, { once: true });

    // console.log("playVideo URL:", url);
    // 読み込み
    videoBufferState.videoElement.src = await videoBufferState.currentObjectUrl;
    videoBufferState.videoElement.preload = "metadata";
    // video.muted = true; // 自動再生が必要なら
    await videoBufferState.videoElement.play().catch(() => {
      console.log("Autoplay failed, user interaction may be required.");
      void 0;
    });
  }
}

// /**
//  * ArrayBuffer の WebM (VP8/Opus) を #videoBuffer の <video> で再生する
//  */
// export async function playVideo(buffer: ArrayBuffer): Promise<void> {
//   const video = document.getElementById(
//     "videoBuffer"
//   ) as HTMLVideoElement | null;
//   if (!video) throw new Error('video element with id "videoBuffer" not found.');

//   const mime = 'video/webm; codecs="vp8, opus"';

//   // 再生可否チェック（空文字なら未対応の可能性が高い）
//   if (video.canPlayType(mime) === "") {
//     console.warn(`This browser may not support ${mime}.`);
//   }

//   // 既存の再生を停止
//   try {
//     video.pause();
//   } catch {
//     /* noop */
//   }

//   // Blob → Object URL で <video> に供給
//   const blob = new Blob([buffer], { type: mime });
//   const url = URL.createObjectURL(blob);
//   console.log("playVideo URL:", url);

//   // 終了/破棄時に URL を解放
//   const revoke = () => URL.revokeObjectURL(url);
//   video.addEventListener("ended", revoke, { once: true });
//   video.addEventListener("emptied", revoke, { once: true });

//   // 必要なら UI 設定
//   video.controls = true; // コントロール表示
//   // video.muted = true;      // 自動再生したい場合は有効化（ブラウザの自動再生ポリシー対策）

//   // ロード & 再生
//   const onLoaded = () => {
//     video.removeEventListener("loadedmetadata", onLoaded);
//     // 自動再生を試みる（失敗してもロード自体は成功している）
//     void video.play().catch((err) => {
//       console.warn("Autoplay failed (user gesture may be required):", err);
//     });
//   };

//   const onError = () => {
//     video.removeEventListener("error", onError);
//     revoke();
//     throw new Error("Video element failed to load the provided WebM data.");
//   };

//   video.addEventListener("loadedmetadata", onLoaded, { once: true });
//   // video.addEventListener("error", onError, { once: true });

//   video.src = url;
//   // video.load();
// }

// 終了・破棄時に解放（次の割当でも解放するため二重でもOK）
const cleanup = () => {
  console.log("clean up");
  if (videoBufferState.currentObjectUrl) {
    URL.revokeObjectURL(videoBufferState.currentObjectUrl);
    videoBufferState.currentObjectUrl = null;
  }
  // video.removeEventListener("ended", cleanup);
  // video.removeEventListener("emptied", cleanup);
};
