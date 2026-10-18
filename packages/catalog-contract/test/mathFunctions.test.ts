import { describe, expect, test } from "bun:test";
import { char, classifyLetterRun, isInverseExponent } from "../src";

describe("classifyLetterRun", () => {
  test("a call: the letters before the name are variables", () => {
    expect(classifyLetterRun("sin", true)).toEqual({
      kind: "call",
      name: "sin",
      letters: "",
    });
    expect(classifyLetterRun("asin", true)).toEqual({
      kind: "call",
      name: "sin",
      letters: "a",
    });
    expect(classifyLetterRun("mxln", true)).toEqual({
      kind: "call",
      name: "ln",
      letters: "mx",
    });
  });

  test("a name without its brackets", () => {
    expect(classifyLetterRun("sin", false)).toEqual({
      kind: "bare",
      name: "sin",
    });
    expect(classifyLetterRun("sinx", false)).toEqual({
      kind: "bare",
      name: "sin",
    });
    expect(classifyLetterRun("xcosy", true)).toEqual({
      kind: "bare",
      name: "cos",
    });
  });

  test("functions that do not exist, with and without brackets", () => {
    for (const [word, name] of [
      ["tan", "tan"],
      ["arcsin", "arcsin"],
      ["arccos", "arccos"],
      ["arctan", "arctan"],
      ["cot", "cot"],
      ["log", "log"],
      ["exp", "exp"],
      ["sinh", "sinh"],
      ["cosh", "cosh"],
      ["tanh", "tanh"],
      ["atan", "tan"],
    ] as const) {
      expect(classifyLetterRun(word, true)).toEqual({
        kind: "unsupported",
        name,
      });
    }
    expect(classifyLetterRun("tanx", false)).toEqual({
      kind: "unsupported",
      name: "tan",
    });
  });

  test("arcsin is no arc times sin", () => {
    expect(classifyLetterRun("arcsin", true).kind).toBe("unsupported");
    expect(classifyLetterRun("sinh", true).kind).toBe("unsupported");
  });

  test("plain letters", () => {
    expect(classifyLetterRun("mx", false)).toEqual({
      kind: "letters",
      letters: "mx",
    });
    expect(classifyLetterRun("f", true)).toEqual({
      kind: "letters",
      letters: "f",
    });
  });
});

describe("isInverseExponent", () => {
  test("a leading minus is the inverse", () => {
    expect(isInverseExponent([char("-"), char("1")])).toBe(true);
    expect(isInverseExponent([char("−"), char("1")])).toBe(true);
    expect(isInverseExponent([char("2")])).toBe(false);
    expect(isInverseExponent([])).toBe(false);
  });
});
