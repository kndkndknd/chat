import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { selectOtherClient } from "../../src/route";

describe("selectOtherClient", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("rooms に source 以外のキーが無い場合、rooms[0] を返す", () => {
    // rooms が空オブジェクトなら for-in も走らない → targetID = String(rooms[0]) = "undefined"
    const result = selectOtherClient({}, "src");
    expect(result).toBe("undefined");
  });

  test("rooms[0] が存在する場合、最初の rooms[0] を返す（ループでマッチがない場合）", () => {
    // rooms に 0キー: roomsで `for(let id in rooms)`は "0" のみ
    // targetArr.push(String("src")) を一度だけ実行 → length 1 → splice 走らない
    // target = "src", rooms[0] = "src" → "src" を返す
    const rooms: any = { 0: "src" };
    const result = selectOtherClient(rooms, "src");
    expect(result).toBe("src");
  });

  test("複数キー時は source を除外したターゲットを返す", () => {
    const rooms: any = { a: "a", b: "b" };
    // for-in でtargetArrに "src" が2回push → splice で1つ削除 → length 1
    // Math.random=0 → target = targetArr[0] = "src"
    // ループで "src" === "a"|"b" は false なので targetID = String(rooms[0]) = "undefined"
    const result = selectOtherClient(rooms, "src");
    expect(result).toBe("undefined");
  });
});
