import { describe, expect, test } from "bun:test";
import { sameSet, unsentChoice } from "./draft";

describe("sameSet", () => {
  test("ignores the order", () => {
    expect(sameSet(["a", "b"], ["b", "a"])).toBe(true);
    expect(sameSet(["a"], ["a", "b"])).toBe(false);
    expect(sameSet(["a", "b"], ["a", "c"])).toBe(false);
  });
});

describe("unsentChoice", () => {
  test("nothing ticked loses nothing", () => {
    expect(unsentChoice(null, null)).toBeNull();
    expect(unsentChoice(null, [])).toBeNull();
    expect(unsentChoice(["a"], [])).toBeNull();
  });

  test("ticks without any submission are lost altogether", () => {
    expect(unsentChoice(null, ["a"])).toBe("never");
  });

  test("ticks that differ from the submitted answer are a lost change", () => {
    expect(unsentChoice(["a"], ["a", "b"])).toBe("changed");
  });

  test("a submitted selection loses nothing", () => {
    expect(unsentChoice(["a", "b"], ["b", "a"])).toBeNull();
  });
});
