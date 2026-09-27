import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../src/state", () => ({
  clientState: { client: {} as Record<string, any> },
}));

import {
  tileKey,
  tilePosition,
  tileMeta,
  clearTiles,
} from "../../src/clientSetting/tileLayout";
import { clientState } from "../../src/state";

const reset = () => {
  clearTiles();
  for (const k of Object.keys(clientState.client))
    delete (clientState.client as any)[k];
  (clientState.client as any).proj = {
    projection: true,
    position: { top: 0, left: 0, width: 800, height: 600 },
  };
};

describe("tileLayout", () => {
  beforeEach(() => {
    reset();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    vi.spyOn(Math, "floor").mockImplementation((v: number) => Math.trunc(v));
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("tileKey は発信元IDがあれば source:origin、無ければ source", () => {
    expect(tileKey("CHAT", "abc")).toBe("CHAT:abc");
    expect(tileKey("CHAT")).toBe("CHAT");
    expect(tileKey("PLAYBACK", undefined)).toBe("PLAYBACK");
    expect(tileKey("CHAT", "")).toBe("CHAT");
  });

  test("tilePosition は projection の画面サイズから乱数で矩形を作る", () => {
    // sizeRandomize=0.5, base 800x600, aspect=0.75
    // width=trunc(0.5*400+200)=400, height=300, left=trunc(0.5*400)=200, top=trunc(0.5*300)=150
    expect(tilePosition("PLAYBACK")).toEqual({
      top: 150,
      left: 200,
      width: 400,
      height: 300,
    });
  });

  test("同じキーは既存の矩形を再利用する（乱数が変わっても不変）", () => {
    const first = tilePosition("CHAT:abc");
    (Math.random as any).mockReturnValue(0.9);
    const second = tilePosition("CHAT:abc");
    expect(second).toEqual(first);
  });

  test("tileMeta は tile/key/position を返す", () => {
    const meta = tileMeta("CHAT", "abc");
    expect(meta.tile).toBe(true);
    expect(meta.key).toBe("CHAT:abc");
    expect(meta.position).toEqual({
      top: 150,
      left: 200,
      width: 400,
      height: 300,
    });
  });

  test("clearTiles 後は同じキーでも新しい矩形を作る", () => {
    const first = tilePosition("CHAT:abc");
    clearTiles();
    (Math.random as any).mockReturnValue(0.9);
    const second = tilePosition("CHAT:abc");
    expect(second).not.toEqual(first);
  });
});
