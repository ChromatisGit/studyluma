import { describe, expect, test } from "bun:test";
import { keyFor } from "./useTeacherKeys";

const press = (key: string, extra: Record<string, boolean> = {}) => ({
  key,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  ...extra,
});

describe("keyFor", () => {
  test("maps the presenter keys", () => {
    expect(keyFor(press(" "))).toBe("next");
    expect(keyFor(press("ArrowRight"))).toBe("next");
    expect(keyFor(press("ArrowLeft"))).toBe("previous");
    expect(keyFor(press("Escape"))).toBe("escape");
    expect(keyFor(press("B"))).toBe("hide");
    expect(keyFor(press("z", { ctrlKey: true }))).toBe("undo");
    expect(keyFor(press("x", { ctrlKey: true }))).toBeUndefined();
    expect(keyFor(press("b", { altKey: true }))).toBeUndefined();
  });

  test("an open dialog keeps every key", () => {
    for (const key of ["Escape", " ", "ArrowRight", "ArrowLeft", "b"]) {
      expect(keyFor(press(key), true)).toBeUndefined();
    }
    expect(keyFor(press("z", { ctrlKey: true }), true)).toBeUndefined();
  });
});
