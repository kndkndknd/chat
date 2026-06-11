import { describe, expect, test } from "vitest";
import { getTypeArr } from "../../../src/cmd/splitSpace/getTypeArr";

describe("getTypeArr", () => {
  test("数字文字列は number に分類される", () => {
    expect(getTypeArr(["0", "1", "120", "0.5"])).toEqual([
      "number",
      "number",
      "number",
      "number",
    ]);
  });

  test("英字のみは string に分類される", () => {
    expect(getTypeArr(["CHAT", "PLAYBACK", "abc"])).toEqual([
      "string",
      "string",
      "string",
    ]);
  });

  test("空文字も /^[A-Za-z]*$/ にマッチして string に分類される", () => {
    expect(getTypeArr([""])).toEqual(["string"]);
  });

  test("英数字混在や記号を含むものは other に分類される", () => {
    expect(getTypeArr(["AB12", "12-34", "hello!"])).toEqual([
      "other",
      "other",
      "other",
    ]);
  });

  test("空配列は空配列を返す", () => {
    expect(getTypeArr([])).toEqual([]);
  });

  test("混在パターンを正しく分類する", () => {
    expect(getTypeArr(["120", "CHAT", "AB1"])).toEqual([
      "number",
      "string",
      "other",
    ]);
  });
});
