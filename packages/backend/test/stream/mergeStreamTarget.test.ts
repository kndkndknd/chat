import { describe, expect, test } from "vitest";
import { mergeStreamTarget } from "../../src/stream/mergeStreamTarget";

describe("mergeStreamTarget", () => {
  test("各 stream の target を flatten して重複除去した配列を返す", () => {
    const streamState: any = {
      target: {
        CHAT: ["a", "b"],
        PLAYBACK: ["b", "c"],
        TIMELAPSE: ["c", "d"],
      },
    };
    const result = mergeStreamTarget(streamState);
    expect(result.sort()).toEqual(["a", "b", "c", "d"]);
  });

  test("空ターゲットは空配列を返す", () => {
    const streamState: any = {
      target: { CHAT: [], PLAYBACK: [] },
    };
    expect(mergeStreamTarget(streamState)).toEqual([]);
  });

  test("target キーが存在しない場合", () => {
    const streamState: any = { target: {} };
    expect(mergeStreamTarget(streamState)).toEqual([]);
  });
});
