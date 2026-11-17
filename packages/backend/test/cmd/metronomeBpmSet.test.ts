import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { clientState, bpmState, stringEmit } = vi.hoisted(() => ({
  clientState: { client: {} as Record<string, { index: number }> },
  bpmState: {} as Record<string, { bpm: number }>,
  stringEmit: vi.fn(),
}));

vi.mock("../../src/state", () => ({ clientState, bpmState }));
vi.mock("../../src/socket/ioEmit", () => ({ stringEmit }));

describe("metronomeBpmSet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));
    clientState.client = { c1: { index: 1 } };
    bpmState.c1 = { bpm: 60 };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("4回のタップ間隔からBPMを算出して全クライアントへ反映する", async () => {
    const { metronomeBpmSet } = await import("../../src/cmd/metronomeBpmSet");

    metronomeBpmSet("c1");
    vi.advanceTimersByTime(600);
    metronomeBpmSet("c1");
    vi.advanceTimersByTime(600);
    metronomeBpmSet("c1");
    vi.advanceTimersByTime(600);
    metronomeBpmSet("c1");

    expect(bpmState.c1.bpm).toBeCloseTo(100, 6);
    expect(stringEmit).toHaveBeenCalledWith("1 BPM: 100", true, "c1");
  });

  test("タップ間隔が一定でない場合も平均からBPMを算出する", async () => {
    const { metronomeBpmSet } = await import("../../src/cmd/metronomeBpmSet");

    metronomeBpmSet("c1");
    vi.advanceTimersByTime(500);
    metronomeBpmSet("c1");
    vi.advanceTimersByTime(600);
    metronomeBpmSet("c1");
    vi.advanceTimersByTime(600);
    metronomeBpmSet("c1");

    expect(bpmState.c1.bpm).toBeCloseTo(60000 / ((500 + 600 + 600) / 3), 6);
    expect(stringEmit).toHaveBeenCalledWith(
      expect.stringMatching(/^1 BPM: /),
      true,
      "c1",
    );
  });

  test("未登録クライアントのタップは無視する", async () => {
    const { metronomeBpmSet } = await import("../../src/cmd/metronomeBpmSet");

    metronomeBpmSet("unknown");

    expect(stringEmit).not.toHaveBeenCalled();
    expect(bpmState.c1.bpm).toBe(60);
  });
});
