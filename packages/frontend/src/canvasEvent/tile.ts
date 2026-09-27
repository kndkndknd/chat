import { canvasElement } from "./canvasElement";

type tilePosition = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type tileEntry = {
  key: string;
  position: tilePosition;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  updatedAt: number;
};

// 投影先クライアントのタイル台帳。キーはサーバが決める (source[:origin])。
// 各タイルはオフスクリーン canvas に保持し、メイン canvas へ合成する。
const tiles = new Map<string, tileEntry>();

let tileMode = false;
let compositeScheduled = false;

export const isTileMode = (): boolean => tileMode;

const requestFrame = (cb: FrameRequestCallback): void => {
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(cb);
  } else {
    setTimeout(() => cb(Date.now()), 16);
  }
};

const sizeCanvas = (tile: tileEntry, position: tilePosition) => {
  const width = Math.max(1, Math.round(position.width));
  const height = Math.max(1, Math.round(position.height));
  if (tile.canvas.width !== width) tile.canvas.width = width;
  if (tile.canvas.height !== height) tile.canvas.height = height;
  tile.position = position;
};

const ensureTile = (key: string, position: tilePosition): tileEntry => {
  let tile = tiles.get(key);
  if (tile === undefined) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    tile = {
      key,
      position,
      canvas,
      ctx: ctx as CanvasRenderingContext2D,
      updatedAt: Date.now(),
    };
    sizeCanvas(tile, position);
    tiles.set(key, tile);
  } else {
    // 既存枠の再利用。位置・サイズが変わったら canvas を合わせる。
    sizeCanvas(tile, position);
  }
  return tile;
};

// タイル枠いっぱいに映像をアスペクト比を保って収める (contain)。
const fit = (
  imgW: number,
  imgH: number,
  boxW: number,
  boxH: number,
): { x: number; y: number; w: number; h: number } => {
  const aspect = imgW / imgH;
  let w = boxW;
  let h = boxW / aspect;
  if (h > boxH) {
    h = boxH;
    w = boxH * aspect;
  }
  return { x: (boxW - w) / 2, y: (boxH - h) / 2, w, h };
};

// タイルのオフスクリーン canvas を更新し、合成を予約する。
export const drawTile = (
  video: string,
  position: tilePosition,
  key: string,
): void => {
  if (!video || !position || !key) return;
  tileMode = true;
  const tile = ensureTile(key, position);
  const image = new Image();
  image.onload = () => {
    const ctx = tile.ctx;
    ctx.clearRect(0, 0, tile.canvas.width, tile.canvas.height);
    const box = fit(
      image.width,
      image.height,
      tile.canvas.width,
      tile.canvas.height,
    );
    ctx.drawImage(image, box.x, box.y, box.w, box.h);
    tile.updatedAt = Date.now();
    scheduleComposite();
  };
  image.src = video;
};

const scheduleComposite = (): void => {
  if (compositeScheduled) return;
  compositeScheduled = true;
  requestFrame(() => {
    compositeScheduled = false;
    composite();
  });
};

// 全タイルを更新時刻の昇順 (古い→新しい = 最新が前面) でメイン canvas へ合成する。
const composite = (): void => {
  const { cnvs, ctx } = canvasElement;
  if (!cnvs || !ctx) return;
  ctx.clearRect(0, 0, cnvs.width, cnvs.height);
  const ordered = [...tiles.values()].sort((a, b) => a.updatedAt - b.updatedAt);
  ordered.forEach((tile) => {
    ctx.drawImage(
      tile.canvas,
      tile.position.left,
      tile.position.top,
      tile.position.width,
      tile.position.height,
    );
  });
};

// 全タイルを破棄してメイン canvas を消去する。
export const clearTiles = (): void => {
  tiles.clear();
  const { cnvs, ctx } = canvasElement;
  if (cnvs && ctx) {
    ctx.clearRect(0, 0, cnvs.width, cnvs.height);
  }
};
