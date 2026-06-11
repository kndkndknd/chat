import { describe, expect, test } from "vitest";
import { IoFacade } from "../../../src/socket/IoFacade";

describe("IoFacade.generateId", () => {
  test("UUID v4 形式の文字列を返す", () => {
    const facade = new IoFacade();
    const id = facade.generateId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  test("呼び出すたび異なる ID を返す", () => {
    const facade = new IoFacade();
    const a = facade.generateId();
    const b = facade.generateId();
    expect(a).not.toBe(b);
  });
});
