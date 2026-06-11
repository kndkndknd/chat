// 受信映像 <video> の表示レイアウト共通処理。
// /webrtc (syncClient) と /relay (relayReceiver) の両方で、受信映像を canvas より
// 前面に出し、ウィンドウ内に収まるランダムなサイズ・位置で表示するために使う。

// 通話/中継中だけリモート映像を canvas より前面に出す z-index (旧 msePlayback.ts と同値)。
export const VIDEO_FRONT_Z_INDEX = "10";

// el を最前面に出し、回転後の視覚的サイズを考慮してウィンドウ内に収まる
// ランダムなサイズと位置を設定する。サイズ範囲: ウィンドウの 1/3 〜 1 倍。
// rotationDeg が 0 (= 回転なし) のときは transform を付けない。
export function applyRandomVideoLayout(
  el: HTMLVideoElement,
  rotationDeg = 0,
): void {
  el.style.zIndex = VIDEO_FRONT_Z_INDEX; // canvas 前面
  const deg = ((rotationDeg % 360) + 360) % 360;
  if (deg !== 0) {
    el.style.transform = `rotate(${deg}deg)`;
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const s = 1 / 3 + Math.random() * (2 / 3); // [1/3, 1]

  const swapsAxes = deg === 90 || deg === 270;

  // 要素の CSS サイズ (90/270 度回転では縦横が視覚的に入れ替わる)。
  const elW = Math.round(s * (swapsAxes ? vh : vw));
  const elH = Math.round(s * (swapsAxes ? vw : vh));
  // 回転後の視覚的サイズ。
  const visW = swapsAxes ? elH : elW;
  const visH = swapsAxes ? elW : elH;

  // 視覚的な left/top をウィンドウに収まる範囲 [0, vw-visW] × [0, vh-visH] でランダムに決める。
  const visLeft = Math.random() * Math.max(0, vw - visW);
  const visTop = Math.random() * Math.max(0, vh - visH);

  // CSS transform は要素の中心を軸に回転するため、要素の left/top を逆算する。
  // 要素の中心 = 視覚的な中心 = (visLeft + visW/2, visTop + visH/2)
  el.style.width = `${elW}px`;
  el.style.height = `${elH}px`;
  el.style.left = `${Math.round(visLeft + (visW - elW) / 2)}px`;
  el.style.top = `${Math.round(visTop + (visH - elH) / 2)}px`;
}

// el を最前面に出し、回転後の視覚サイズがウィンドウいっぱいになる最大サイズで
// 中央に配置する。rotationDeg が 0 のときはウィンドウ全面 (left/top=0) になる。
export function applyMaxVideoLayout(
  el: HTMLVideoElement,
  rotationDeg = 0,
): void {
  el.style.zIndex = VIDEO_FRONT_Z_INDEX; // canvas 前面
  const deg = ((rotationDeg % 360) + 360) % 360;
  if (deg !== 0) {
    el.style.transform = `rotate(${deg}deg)`;
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const swapsAxes = deg === 90 || deg === 270;

  // 90/270 度回転では縦横が視覚的に入れ替わるので、要素サイズも入れ替える。
  const elW = swapsAxes ? vh : vw;
  const elH = swapsAxes ? vw : vh;
  el.style.width = `${elW}px`;
  el.style.height = `${elH}px`;
  // 回転しても視覚的にウィンドウ中央へ収まるよう、要素の left/top を中央寄せにする。
  el.style.left = `${Math.round((vw - elW) / 2)}px`;
  el.style.top = `${Math.round((vh - elH) / 2)}px`;
}

// applyRandomVideoLayout / applyMaxVideoLayout で付与したスタイルを取り除き、
// CSS 本来の表示に戻す。
export function clearVideoLayout(el: HTMLVideoElement): void {
  el.style.removeProperty("z-index"); // CSS 本来の重なり順に戻す
  el.style.removeProperty("transform"); // 回転も解除
  el.style.removeProperty("width");
  el.style.removeProperty("height");
  el.style.removeProperty("left");
  el.style.removeProperty("top");
  el.style.removeProperty("visibility"); // hideVideo の暫定クリアも解除
}

// 一時的な mute (瞬断などで映像が止まりフリーズフレームが残る) の間だけ、
// フレームを隠す暫定クリア。visibility:hidden は再生・レイアウトを保ったまま
// 描画だけ止めるため、unmute で showVideo すれば同じ位置に即復帰できる。
export function hideVideo(el: HTMLVideoElement): void {
  el.style.visibility = "hidden";
}

export function showVideo(el: HTMLVideoElement): void {
  el.style.removeProperty("visibility");
}
