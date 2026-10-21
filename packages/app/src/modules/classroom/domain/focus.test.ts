import { describe, expect, test } from "bun:test";
import { allows, needsCountdown } from "./focus";

describe("what a student device allows", () => {
  test("Unterricht and Austausch keep the calm view only", () => {
    for (const phase of ["unterricht", "austausch"] as const) {
      expect(allows(phase, "calm", false)).toBe(true);
      expect(allows(phase, "pages", false)).toBe(false);
      expect(allows(phase, "sheets", false)).toBe(false);
    }
  });

  test("Aufgabe opens the summaries, not the worksheets", () => {
    expect(allows("aufgabe", "pages", false)).toBe(true);
    expect(allows("aufgabe", "sheets", false)).toBe(false);
  });

  test("Arbeitsblatt opens everything", () => {
    expect(allows("arbeitsblatt", "pages", false)).toBe(true);
    expect(allows("arbeitsblatt", "sheets", false)).toBe(true);
  });

  test("the quiz page stays only while a quiz runs", () => {
    expect(allows("unterricht", "quiz", true)).toBe(true);
    expect(allows("arbeitsblatt", "quiz", false)).toBe(false);
  });
});

describe("the way back", () => {
  test("leaving a green phase counts down", () => {
    expect(needsCountdown("aufgabe", "unterricht")).toBe(true);
    expect(needsCountdown("austausch", "unterricht")).toBe(true);
    expect(needsCountdown("arbeitsblatt", "aufgabe")).toBe(true);
  });

  test("opening more, or starting a green phase, shows at once", () => {
    expect(needsCountdown("unterricht", "aufgabe")).toBe(false);
    expect(needsCountdown("austausch", "aufgabe")).toBe(false);
    expect(needsCountdown("aufgabe", "arbeitsblatt")).toBe(false);
    expect(needsCountdown("aufgabe", "aufgabe")).toBe(false);
  });
});
