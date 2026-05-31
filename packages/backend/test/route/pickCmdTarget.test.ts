import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { pickCmdTarget } from "../../src/route";

describe("pickCmdTarget", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("idHsh の中に cmd と同じものがあれば、その strId が targetId として返る (duplicate path)", () => {
    const idHsh: any = {
      x: { room: "all", standalone: false, No: 1, cmd: { cmd: "BASS", timestamp: 100 } },
      y: { room: "all", standalone: false, No: 2, cmd: { cmd: "none", timestamp: 200 } },
    };
    const result = pickCmdTarget(idHsh, { cmd: "BASS" });
    expect(result).toBe("x");
  });

  test("duplicate がなく、cmd が none の id があればそれが targetId に選ばれる", () => {
    const idHsh: any = {
      a: { room: "all", standalone: false, No: 1, cmd: { cmd: "none", timestamp: 100 } },
      b: { room: "all", standalone: false, No: 2, cmd: { cmd: "FEEDBACK", timestamp: 200 } },
    };
    const result = pickCmdTarget(idHsh, { cmd: "BASS" });
    expect(result).toBe("a");
  });

  test("duplicate も none もない場合は最小 timestamp の id が選ばれる", () => {
    const idHsh: any = {
      a: { room: "all", standalone: false, No: 1, cmd: { cmd: "FEEDBACK", timestamp: 200 } },
      b: { room: "all", standalone: false, No: 2, cmd: { cmd: "WHITENOISE", timestamp: 100 } },
    };
    const result = pickCmdTarget(idHsh, { cmd: "BASS" });
    expect(result).toBe("b");
  });

  test("room フィルタにより別ルームの id は対象外", () => {
    const idHsh: any = {
      a: { room: "main", standalone: false, No: 1, cmd: { cmd: "FEEDBACK", timestamp: 100 } },
      b: { room: "sub", standalone: false, No: 2, cmd: { cmd: "FEEDBACK", timestamp: 50 } },
    };
    const result = pickCmdTarget(idHsh, { cmd: "BASS" }, "main");
    expect(result).toBe("a");
  });
});
