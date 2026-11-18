import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  toggleGainUI: vi.fn(),
  hideGainUI: vi.fn(),
  textPrint: vi.fn(),
  erasePrint: vi.fn(),
  eraseText: vi.fn(),
  bass: vi.fn(),
  sinewave: vi.fn(),
  voice: vi.fn(),
}));

vi.mock("../../src/ui/gainUI", () => ({
  toggleGainUI: mocks.toggleGainUI,
  hideGainUI: mocks.hideGainUI,
}));
vi.mock("../../src/canvasEvent", () => ({
  textPrint: mocks.textPrint,
  erasePrint: mocks.erasePrint,
  eraseText: mocks.eraseText,
}));
vi.mock("../../src/webaudio", () => ({
  bass: mocks.bass,
  sinewave: mocks.sinewave,
}));
vi.mock("../../src/voice", () => ({
  voice: mocks.voice,
}));

import { keyDown } from "../../src/textInput";

const canvas = {} as HTMLCanvasElement;
const context = {} as CanvasRenderingContext2D;

describe("GAIN UI のキーボード操作", () => {
  let socket: { emit: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockClear());
    socket = { emit: vi.fn() };
  });

  it("GAIN + Enter でUIをトグルし、入力文字列をクリアする", () => {
    const next = keyDown(
      { key: "Enter" } as KeyboardEvent,
      "GAIN",
      socket as any,
      canvas,
      context,
    );

    expect(next).toBe("");
    expect(mocks.toggleGainUI).toHaveBeenCalledTimes(1);
    expect(socket.emit).toHaveBeenCalledWith("clearStringFromClient");
    expect(mocks.erasePrint).toHaveBeenCalledWith(context, canvas);
  });

  it("Escape でGAIN UIを非表示にし、入力文字列もクリアする", () => {
    const next = keyDown(
      { key: "Escape" } as KeyboardEvent,
      "ABC",
      socket as any,
      canvas,
      context,
    );

    expect(next).toBe("");
    expect(mocks.hideGainUI).toHaveBeenCalledTimes(1);
    expect(socket.emit).toHaveBeenCalledWith("charFromClient", "Escape");
    expect(mocks.textPrint).toHaveBeenCalledWith("");
  });
});
