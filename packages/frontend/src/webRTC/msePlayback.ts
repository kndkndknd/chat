// MSE (MediaSource Extensions) を使い、backend から WebSocket 経由で送られてくる
// WebM チャンクを <video>/<audio> 要素にライブ再生する。
//
// 使い方 (video):
//   1) attachMsePlayback(videoEl) で <video> に MediaSource を紐付ける
//   2) チャンク到達時に appendMediaChunk(arrayBuffer) を呼ぶ
//   3) セッション終了時に teardownMsePlayback()
//
// 使い方 (audio): attachMseAudioPlayback / appendAudioChunk / teardownMseAudioPlayback
//
// 注意:
//   - 最初に到達するチャンクには必ず WebM の init segment (EBML + Segment ヘッダ
//     + Tracks) が含まれている必要がある。後発接続クライアントは init を取り
//     こぼすため、現状は再生されない。
//   - autoplay は user gesture 後でないとブロックされることが多い。

const VIDEO_MIME = 'video/webm; codecs="vp8"';
const AUDIO_MIME = 'audio/webm; codecs="opus"';

interface PlaybackCtx {
  label: string;
  mime: string;
  el: HTMLMediaElement | null;
  mediaSource: MediaSource | null;
  sourceBuffer: SourceBuffer | null;
  pending: ArrayBuffer[];
  initializing: boolean;
  appendCount: number;
}

function newCtx(label: string, mime: string): PlaybackCtx {
  return {
    label,
    mime,
    el: null,
    mediaSource: null,
    sourceBuffer: null,
    pending: [],
    initializing: false,
    appendCount: 0,
  };
}

const videoCtx: PlaybackCtx = newCtx("video", VIDEO_MIME);
const audioCtx: PlaybackCtx = newCtx("audio", AUDIO_MIME);

function dumpElError(ctx: PlaybackCtx, where: string): void {
  if (!ctx.el?.error) return;
  const codes: Record<number, string> = {
    1: "MEDIA_ERR_ABORTED",
    2: "MEDIA_ERR_NETWORK",
    3: "MEDIA_ERR_DECODE",
    4: "MEDIA_ERR_SRC_NOT_SUPPORTED",
  };
  console.error(
    `[mse:${ctx.label}] ${where}: code=${ctx.el.error.code} (${codes[ctx.el.error.code] ?? "?"}) message="${ctx.el.error.message}"`,
  );
}

function attach(ctx: PlaybackCtx, el: HTMLMediaElement): void {
  if (ctx.mediaSource || ctx.initializing) return;
  if (
    typeof MediaSource === "undefined" ||
    !MediaSource.isTypeSupported(ctx.mime)
  ) {
    console.error(`[mse:${ctx.label}] MediaSource not supported for`, ctx.mime);
    return;
  }
  console.log(`[mse:${ctx.label}] attach`, ctx.mime);
  ctx.initializing = true;
  ctx.el = el;
  el.addEventListener("error", () => dumpElError(ctx, "el error event"));
  ctx.mediaSource = new MediaSource();
  el.src = URL.createObjectURL(ctx.mediaSource);
  ctx.mediaSource.addEventListener("sourceopen", () => onSourceOpen(ctx));
  ctx.mediaSource.addEventListener("sourceended", () =>
    console.log(`[mse:${ctx.label}] sourceended`),
  );
  ctx.mediaSource.addEventListener("sourceclose", () =>
    console.log(`[mse:${ctx.label}] sourceclose`),
  );
}

function onSourceOpen(ctx: PlaybackCtx): void {
  if (!ctx.mediaSource) return;
  try {
    ctx.sourceBuffer = ctx.mediaSource.addSourceBuffer(ctx.mime);
  } catch (e) {
    console.error(`[mse:${ctx.label}] addSourceBuffer failed:`, e);
    return;
  }
  ctx.sourceBuffer.mode = "sequence";
  ctx.sourceBuffer.addEventListener("updateend", () => {
    ctx.appendCount++;
    if (ctx.appendCount <= 5 || ctx.appendCount % 50 === 0) {
      const ranges = ctx.sourceBuffer?.buffered;
      const rangesStr = ranges && ranges.length
        ? `[${ranges.start(0).toFixed(2)}-${ranges.end(ranges.length - 1).toFixed(2)}]`
        : "(empty)";
      console.log(
        `[mse:${ctx.label}] appended #${ctx.appendCount}, buffered=${rangesStr}`,
      );
    }
    flush(ctx);
  });
  ctx.sourceBuffer.addEventListener("error", (e) => {
    console.error(`[mse:${ctx.label}] sourceBuffer error event`, e);
    dumpElError(ctx, "sourceBuffer error");
  });
  flush(ctx);
  ctx.el?.play().catch((e) =>
    console.warn(`[mse:${ctx.label}] autoplay blocked:`, e),
  );
}

function appendChunk(ctx: PlaybackCtx, chunk: ArrayBuffer): void {
  ctx.pending.push(chunk);
  if (ctx.mediaSource) flush(ctx);
}

function flush(ctx: PlaybackCtx): void {
  if (!ctx.sourceBuffer || ctx.sourceBuffer.updating) return;
  const next = ctx.pending.shift();
  if (!next) return;
  try {
    ctx.sourceBuffer.appendBuffer(next);
  } catch (e) {
    console.error(`[mse:${ctx.label}] appendBuffer failed:`, e);
    dumpElError(ctx, "after appendBuffer failure");
  }
}

function teardown(ctx: PlaybackCtx): void {
  ctx.pending = [];
  if (ctx.mediaSource && ctx.mediaSource.readyState === "open") {
    try { ctx.mediaSource.endOfStream(); } catch { /* ignore */ }
  }
  if (ctx.el) {
    try { URL.revokeObjectURL(ctx.el.src); } catch { /* ignore */ }
    ctx.el.removeAttribute("src");
    ctx.el.load();
  }
  ctx.sourceBuffer = null;
  ctx.mediaSource = null;
  ctx.el = null;
  ctx.initializing = false;
  ctx.appendCount = 0;
}

// WebRTC 通話中 (受信映像を MSE 再生している間) だけ <video> を canvas より前面に
// 出す。canvas (#cnvs) は z-index:2 なので、それより大きい値を直接指定する。
// 通話が終わると元の重なり順 (CSS の z-index:1) に戻す。
const VIDEO_FRONT_Z_INDEX = "10";

function bringVideoToFront(el: HTMLVideoElement): void {
  el.style.zIndex = VIDEO_FRONT_Z_INDEX;
}

function restoreVideoStacking(el: HTMLVideoElement | null): void {
  // インラインの z-index を外し、CSS 側の本来の重なり順に戻す。
  if (el) el.style.removeProperty("z-index");
}

// ── video API ──
export function attachMsePlayback(el: HTMLVideoElement): void {
  attach(videoCtx, el);
  // attach は再生中なら早期 return するが、z-index の付与は冪等なので毎回呼んでよい。
  bringVideoToFront(el);
}
export function appendMediaChunk(chunk: ArrayBuffer): void {
  appendChunk(videoCtx, chunk);
}
export function teardownMsePlayback(): void {
  restoreVideoStacking(videoCtx.el as HTMLVideoElement | null);
  teardown(videoCtx);
}

// ── audio API ──
export function attachMseAudioPlayback(el: HTMLAudioElement): void {
  attach(audioCtx, el);
}
export function appendAudioChunk(chunk: ArrayBuffer): void {
  appendChunk(audioCtx, chunk);
}
export function teardownMseAudioPlayback(): void {
  teardown(audioCtx);
}
