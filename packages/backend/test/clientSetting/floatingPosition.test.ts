import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../src/state", () => ({
  clientState: { client: {} as Record<string, any> },
}));

import { floatingPosition } from "../../src/clientSetting/floatingPosition";
import { clientState } from "../../src/state";

const reset = () => {
  for (const k of Object.keys(clientState.client))
    delete (clientState.client as any)[k];
};

describe("floatingPosition", () => {
  beforeEach(() => {
    reset();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    vi.spyOn(Math, "floor").mockImplementation((v: number) => Math.trunc(v));
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("既に登録済みなら自分の position を返す", () => {
    (clientState.client as any).me = {
      projection: false,
      position: { top: 1, left: 2, width: 3, height: 4 },
    };
    expect(floatingPosition("me")).toEqual({
      top: 1,
      left: 2,
      width: 3,
      height: 4,
    });
  });

  test("未登録のとき projection クライアントが無く非 projection 0 件 → default 分岐", () => {
    // case default: top/left/width/height が計算で導出される
    const pos = floatingPosition("new");
    expect(typeof pos.top).toBe("number");
    expect(typeof pos.left).toBe("number");
    expect(typeof pos.width).toBe("number");
    expect(typeof pos.height).toBe("number");
  });

  test("非 projection が 1 件あれば case 1 の式で計算", () => {
    (clientState.client as any).other = {
      projection: false,
      position: { top: 0, left: 0, width: 100, height: 100 },
    };
    const pos = floatingPosition("new");
    // projectionPosition = default {1920x1080}, aspect = 1080/1920 = 0.5625
    // case 1 (otherが1件): top=Math.floor(random*1080/2)=Math.trunc(0.5*1080/2)=270
    // left=Math.floor(0.5*1920/2)=480
    // width=Math.floor(0.5*1920/4 + 1920/4)=Math.trunc(240+480)=720
    // height=720*0.5625=405
    expect(pos.top).toBe(270);
    expect(pos.left).toBe(480);
    expect(pos.width).toBe(720);
    expect(pos.height).toBe(405);
  });

  test("projection クライアントが居ればその position を基準に計算", () => {
    (clientState.client as any).proj = {
      projection: true,
      position: { top: 0, left: 0, width: 800, height: 600 },
    };
    (clientState.client as any).a = {
      projection: false,
      position: { top: 0, left: 0, width: 100, height: 100 },
    };
    const pos = floatingPosition("new");
    // projectionPosition = {800x600}, aspect = 600/800 = 0.75
    // case 1: top=Math.trunc(0.5*600/2)=150, left=Math.trunc(0.5*800/2)=200
    // width=Math.trunc(0.5*800/4 + 800/4)=Math.trunc(100+200)=300
    // height=300*0.75=225
    expect(pos).toEqual({ top: 150, left: 200, width: 300, height: 225 });
  });
});
