import { beforeEach, describe, expect, test } from "vitest";
import { loopClear, loopToggle } from "../../../src/stream/loop/loopToggle";
import { streamState } from "../../../src/state";

describe("loopToggle / loopClear", () => {
  beforeEach(() => {
    streamState.loop = {};
  });

  test("未登録の stream は配列を作って target を追加する", () => {
    loopToggle("PLAYBACK", "c1");

    expect(streamState.loop.PLAYBACK).toEqual(["c1"]);
  });

  test("既に含まれる target はトグルで削除する", () => {
    streamState.loop.PLAYBACK = ["c1", "c2"];

    loopToggle("PLAYBACK", "c1");

    expect(streamState.loop.PLAYBACK).toEqual(["c2"]);
  });

  test("loopClear はトグルせず必ず削除する", () => {
    streamState.loop.PLAYBACK = ["c1", "c2"];

    loopClear("PLAYBACK", "c1");
    loopClear("PLAYBACK", "c1");

    expect(streamState.loop.PLAYBACK).toEqual(["c2"]);
  });

  test("未登録 stream の loopClear は空配列を作る", () => {
    loopClear("PLAYBACK", "c1");

    expect(streamState.loop.PLAYBACK).toEqual([]);
  });
});
