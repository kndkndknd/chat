import { clientState } from "../state";

export type tilePositionType = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type tileEntryType = {
  position: tilePositionType;
  updatedAt: number;
};

// TILEモードのタイル台帳。キーは「ソース種別（+ 発信元クライアントID）」。
// source 単位でしか一意化できないソース（PLAYBACK/TIMELAPSE/EMPTY）は
// 発信元IDを持たないためソース名のみをキーにする。
const tiles: { [key: string]: tileEntryType } = {};

export const tileKey = (source: string, originId?: string): string => {
  if (originId === undefined || originId === null || originId === "") {
    return source;
  }
  return `${source}:${originId}`;
};

// 投影先（projection）クライアントの画面サイズを基準にする。
// 未接続時は 1920x1080 を仮定する。
const basePosition = (): tilePositionType => {
  const projectionId = Object.keys(clientState.client).find(
    (id) => clientState.client[id].projection,
  );
  if (projectionId !== undefined && clientState.client[projectionId]) {
    return clientState.client[projectionId].position;
  }
  return { top: 0, left: 0, width: 1920, height: 1080 };
};

// 乱数のサイズ・位置でタイル矩形を作る。重なりは許容する。
const createPosition = (base: tilePositionType): tilePositionType => {
  const sizeRandomize = Math.random();
  const width = Math.floor(sizeRandomize * (base.width / 2) + base.width / 4);
  const aspect = base.height / base.width;
  const height = Math.floor(width * aspect);
  const maxLeft = Math.max(0, base.width - width);
  const maxTop = Math.max(0, base.height - height);
  const left = Math.floor(Math.random() * maxLeft);
  const top = Math.floor(Math.random() * maxTop);
  return {
    top,
    left,
    width: Math.max(1, width),
    height: Math.max(1, height),
  };
};

// 同じキーは同じ矩形を再利用する（既存枠の再利用）。
// 無ければ乱数で生成して台帳へ保存する。
export const tilePosition = (key: string): tilePositionType => {
  if (tiles[key] === undefined) {
    tiles[key] = {
      position: createPosition(basePosition()),
      updatedAt: Date.now(),
    };
  } else {
    tiles[key].updatedAt = Date.now();
  }
  return tiles[key].position;
};

// 送出チャンクに付与するタイル情報。projection クライアント側で
// この情報を見てタイルとして描画する。
export const tileMeta = (
  source: string,
  originId?: string,
): { tile: true; key: string; position: tilePositionType } => {
  const key = tileKey(source, originId);
  return { tile: true, key, position: tilePosition(key) };
};

export const clearTiles = (): void => {
  Object.keys(tiles).forEach((key) => {
    delete tiles[key];
  });
};
