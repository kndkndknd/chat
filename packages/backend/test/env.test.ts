import { beforeEach, describe, expect, test, vi } from "vitest";

const { existsSyncMock, configMock } = vi.hoisted(() => ({
  existsSyncMock: vi.fn(),
  configMock: vi.fn(),
}));

vi.mock("fs", () => ({
  existsSync: existsSyncMock,
}));
vi.mock("dotenv", () => ({
  default: { config: configMock },
}));

import { loadEnv } from "../../src/env";

describe("loadEnv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("指定した .env が存在する場合だけ dotenv.config を呼ぶ", () => {
    existsSyncMock.mockReturnValue(true);

    loadEnv("/tmp/chat-test.env");

    expect(configMock).toHaveBeenCalledWith({ path: "/tmp/chat-test.env" });
  });

  test(".env が無い場合は何もしない", () => {
    existsSyncMock.mockReturnValue(false);

    loadEnv("/tmp/chat-test.env");

    expect(configMock).not.toHaveBeenCalled();
  });
});
