import { describe, expect, it } from "vitest";
import { synthesizeVoice } from "../../src/voice/synthesizeVoice";

describe("synthesizeVoice", () => {
  it("空文字は生成しない", async () => {
    await expect(synthesizeVoice("   ", "en-US")).resolves.toBeNull();
  });

  it("長すぎるテキストは生成しない", async () => {
    await expect(synthesizeVoice("a".repeat(1001), "en-US")).resolves.toBeNull();
  });
});
