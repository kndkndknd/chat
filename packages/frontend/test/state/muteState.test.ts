import { beforeEach, describe, expect, test, vi } from "vitest";

type MuteModule = typeof import("../../src/state/muteState");

let mod: MuteModule;

describe("muteState", () => {
  beforeEach(async () => {
    vi.resetModules();
    mod = await import("../../src/state/muteState");
  });

  test("登録したリスナーへ mute 変更を通知する", () => {
    const listener = vi.fn();
    mod.onMuteChange(listener);

    mod.emitMuteChange(true);

    expect(listener).toHaveBeenCalledWith(true);
  });

  test("複数リスナーへ通知する", () => {
    const a = vi.fn();
    const b = vi.fn();
    mod.onMuteChange(a);
    mod.onMuteChange(b);

    mod.emitMuteChange(false);

    expect(a).toHaveBeenCalledWith(false);
    expect(b).toHaveBeenCalledWith(false);
  });

  test("解除関数を呼ぶと通知されない", () => {
    const listener = vi.fn();
    const off = mod.onMuteChange(listener);

    off();
    mod.emitMuteChange(true);

    expect(listener).not.toHaveBeenCalled();
  });
});
