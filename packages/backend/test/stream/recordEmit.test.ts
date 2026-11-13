import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../src/state", () => ({
  currentState: { RECORD: false },
  cmdState: { VOICE: [] as string[] },
}));
vi.mock("../../src/socket/ioEmit", () => ({
  recordReqEmit: vi.fn(),
  voiceEmit: vi.fn(),
}));
vi.mock("../../src/stream/pushStateStream", () => ({
  pushStateStream: vi.fn(),
}));
vi.mock("../../src/redis/streamsRedis", () => ({
  streamsRedis: {
    getMaxRecordIndex: vi.fn(async () => null),
  },
}));

import {
  recordAsOtherEmit,
  recordEmit,
} from "../../src/stream/recordEmit";
import { currentState } from "../../src/state";

describe("recordEmit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    currentState.RECORD = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("古い録画タイマーが新しい録画の RECORD を落とさない", () => {
    recordEmit("client");
    vi.advanceTimersByTime(5000);

    recordEmit("client");
    vi.advanceTimersByTime(5000);
    expect(currentState.RECORD).toBe(true);

    vi.advanceTimersByTime(5000);
    expect(currentState.RECORD).toBe(false);
  });

  test("recordAsOtherEmit は開始時にタイマーを設定し、停止時に解除する", () => {
    recordAsOtherEmit("CUSTOM");
    expect(currentState.RECORD).toBe(true);
    vi.advanceTimersByTime(10000);
    expect(currentState.RECORD).toBe(false);

    recordAsOtherEmit("CUSTOM");
    expect(currentState.RECORD).toBe(true);
    recordAsOtherEmit("CUSTOM");
    expect(currentState.RECORD).toBe(false);
  });
});
