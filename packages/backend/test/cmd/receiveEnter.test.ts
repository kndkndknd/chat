import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { execEnter, execStop, execStreamPreparation, loadScenario, execScenario } =
  vi.hoisted(() => ({
    execEnter: vi.fn(),
    execStop: vi.fn(),
    execStreamPreparation: vi.fn(),
    loadScenario: vi.fn(),
    execScenario: vi.fn(),
  }));

vi.mock("../../src/cmd/execEnter", () => ({ execEnter }));
vi.mock("../../src/cmd/execStop", () => ({ execStop }));
vi.mock("../../src/cmd/execStreamPreparation", () => ({ execStreamPreparation }));
vi.mock("../../src/scenario/loadScenario", () => ({ loadScenario }));
vi.mock("../../src/scenario/execScenario", () => ({ execScenario }));

import { receiveEnter } from "../../src/cmd/receiveEnter";
import { streamState } from "../../src/state/states/streamState";
import { ioState } from "../../src/state/states/ioState";

describe("receiveEnter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    streamState.floating = false;
    loadScenario.mockResolvedValue({ timetable: {} });
    ioState.io = {
      emit: vi.fn(),
      to: vi.fn(() => ({ emit: vi.fn() })),
    } as any;
  });

  afterEach(() => {
    ioState.io = null;
  });

  it("SOLFEGGIO を execEnter へ渡す", async () => {
    await receiveEnter("SOLFEGGIO", "all");

    expect(execEnter).toHaveBeenCalledWith("SOLFEGGIO", "all");
  });

  it("CHAT を execStreamPreparation へ渡す", async () => {
    await receiveEnter("CHAT", "c1");

    expect(execStreamPreparation).toHaveBeenCalledWith("CHAT", "c1");
  });

  it("STOP は execStop に ALL を渡す", async () => {
    await receiveEnter("STOP", "c1");

    expect(execStop).toHaveBeenCalledWith("", "ALL");
  });

  it("START はシナリオを読み込んで実行する", async () => {
    await receiveEnter("START", "c1");

    expect(loadScenario).toHaveBeenCalledWith();
    expect(execScenario).toHaveBeenCalledWith({ timetable: {} });
  });

  it("FLOATING はフラグを反転する", async () => {
    await receiveEnter("FLOATING", "c1");
    expect(streamState.floating).toBe(true);

    await receiveEnter("FLOATING", "c1");
    expect(streamState.floating).toBe(false);
  });
});
